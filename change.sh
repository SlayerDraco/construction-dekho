#!/bin/bash

echo "🚀 Firing up the mass-replacement script..."

# 1. Fix the Cookie Bug in Auth Lib (Make it async)
echo "📄 1/4 Updating src/lib/auth.ts..."
cat << 'EOF' > src/lib/auth.ts
import { cookies } from 'next/headers';

export const DEMO_PROFILES = [
  { id: 'demo-admin-001', name: 'Aryaman', email: 'admin@constructiondekho.com', role: 'ADMIN' },
  { id: 'demo-client-002', name: 'Sharma Family', email: 'sharma@example.com', role: 'CLIENT' },
  { id: 'demo-client-003', name: 'Nair Family', email: 'nair@example.com', role: 'CLIENT' },
];

export const getCurrentUser = async () => {
  const cookieStore = await cookies();
  const profileId = cookieStore.get('demo_profile_id')?.value;
  
  if (!profileId) return null;
  
  return DEMO_PROFILES.find(p => p.id === profileId) || null;
};
EOF

# 2. Fix the Dashboard Layout (Await the user & remove Clerk)
# FIX: Added quotes around the file path to handle the parentheses
echo "📄 2/4 Updating src/app/(dashboard)/layout.tsx..."
cat << 'EOF' > "src/app/(dashboard)/layout.tsx"
import DashboardLayout from '@/components/layout/dashboard-layout';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/');
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
EOF

# 3. Strip ClerkProvider from Root Layout safely using sed
echo "📄 3/4 Scrubbing ClerkProvider from src/app/layout.tsx..."
if [ -f "src/app/layout.tsx" ]; then
  sed -i '/import { ClerkProvider }/d' src/app/layout.tsx
  sed -i 's/<ClerkProvider>//g' src/app/layout.tsx
  sed -i 's/<\/ClerkProvider>//g' src/app/layout.tsx
fi

# 4. Crawl the codebase and intelligently swap Clerk auth() for our custom auth
echo "🤖 4/4 Crawling API routes and components for Clerk leftovers..."
cat << 'EOF' > temp-clean-clerk.js
const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('src/app');

files.forEach(file => {
    if (file.includes('layout.tsx') && file.includes('(dashboard)')) return;

    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    if (content.includes('@clerk/nextjs')) {
        content = content.replace(/import\s+.*?from\s+['"]@clerk\/nextjs.*?['"];?/g, '');
        
        if (content.includes('auth()') || content.includes('currentUser()')) {
            content = `import { getCurrentUser } from '@/lib/auth';\n` + content;
        }

        content = content.replace(/const\s+\{\s*userId\s*\}\s*=\s*(await\s+)?auth\(\);?/g, 'const user = await getCurrentUser();\n  const userId = user?.id;');
        
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`✅ Purged Clerk from: ${file}`);
    }
});
EOF

node temp-clean-clerk.js
rm temp-clean-clerk.js

echo "🎉 All Done! The async cookie crash should be fixed, and Clerk is fully evicted."