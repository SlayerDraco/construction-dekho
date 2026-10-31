# HCOS – House Construction Operating System

A complete, production-grade platform guiding homeowners through every stage of house construction in India.

## Tech Stack
- Frontend: Next.js 15, TypeScript, TailwindCSS
- Backend: Next.js Route Handlers
- Database: PostgreSQL + Prisma ORM
- Auth: Clerk
- Storage: Cloudflare R2
- Theme: Light + Dark mode

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Environment Variables
```bash
cp .env.example .env.local
# Set DATABASE_URL (R2 credentials are optional, uploads only)
```

### 3. Database Setup
```bash
npx prisma generate
npx prisma db push
npm run db:seed   # loads the demo profiles + projects
```

### 4. Run
```bash
npm run dev
```

## Demo Profiles
No sign-in. Open the app and pick a profile (Aryaman = Admin, Sharma Family, Nair Family). Use **Switch Profile** in the sidebar to change.
