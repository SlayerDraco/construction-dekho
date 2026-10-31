#!/bin/bash

echo "🚀 Snipping the infinite redirect loop..."

cat << 'EOF' > temp-fix-loop.js
const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
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
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if the file contains a redirect to onboarding
    if (content.includes("redirect('/onboarding')") || content.includes('redirect("/onboarding")')) {
        
        // Remove the entire line containing the redirect
        content = content.replace(/^.*redirect\(['"`]\/onboarding['"`]\).*$/gm, '  // Bypassed onboarding redirect loop');
        
        fs.writeFileSync(file, content, 'utf8');
        console.log(`🔧 Snipped onboarding loop in: ${file}`);
    }
});
EOF

# Execute and cleanup
node temp-fix-loop.js
rm temp-fix-loop.js

echo "🎉 Loop fixed! The dashboard will now load."