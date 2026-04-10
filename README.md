# Skill Hub

An open platform for uploading, managing, sharing, and discovering AI Agent Skills.

## Features

- 🔐 **User Authentication** — Register, login with JWT + HttpOnly cookies
- 📦 **Skill Management** — Upload (ZIP), create, edit, delete skills
- 🔍 **Search & Filter** — Full-text search, filter by category/owner, sort by date/stars
- ⭐ **Star System** — Star your favorite skills (optimistic updates)
- 📄 **README Rendering** — Full Markdown rendering with syntax highlighting
- 📁 **File Browser** — Browse and edit skill files with syntax highlighting
- 📥 **Download** — Download skills as ZIP packages
- 🏷️ **Categories** — Create and manage skill categories
- 🌐 **i18n** — English and Chinese with auto-detection and manual switching
- 📱 **Responsive** — Works on desktop, tablet, and mobile

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL 15 + Drizzle ORM
- **Auth**: JWT (jose) + HttpOnly Cookies
- **Styling**: Tailwind CSS 4 + Radix UI
- **i18n**: next-intl

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/cymoo/skill-hub.git
   cd skill-hub
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your PostgreSQL connection string and a JWT secret:
   ```env
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/skillhub
   JWT_SECRET=your-secret-key-here-at-least-32-characters
   UPLOAD_DIR=./data/skills
   MAX_ZIP_SIZE_MB=50
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
   `NEXT_PUBLIC_APP_URL` 的协议会影响认证 Cookie 的 `secure` 行为：`https://` 会设置为 secure，`http://` 不会。

3. **Create the database:**
   ```bash
   createdb skillhub
   ```

4. **Run migrations:**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. **Seed demo data (optional):**
   ```bash
   npm run db:seed
   ```
   This creates sample categories, a demo user (`demo@skillhub.dev` / `demo1234`), and example skills.

6. **Start the dev server:**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000).

### Production Deployment

```bash
npm run build
npm start
```

The app uses `output: "standalone"` for self-hosting. The build output in `.next/standalone` can be deployed independently.

## Project Structure

```
src/
├── app/
│   ├── [locale]/          # i18n route group
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Home page
│   │   ├── auth/          # Login & register
│   │   ├── dashboard/     # User dashboard
│   │   └── skills/[id]/   # Skill detail
│   └── api/               # API routes
│       ├── auth/           # Auth endpoints
│       ├── categories/     # Category CRUD
│       ├── skills/         # Skill CRUD, upload, download, star, files
│       └── dashboard/      # Dashboard stats
├── components/
│   ├── ui/                # Base UI components
│   └── layout/            # Header, footer, locale switcher
├── db/
│   ├── schema.ts          # Drizzle ORM schema
│   ├── index.ts           # Database client
│   └── seed.ts            # Seed script
├── i18n/                  # Internationalization config
├── lib/                   # Utilities (auth, storage, validators, etc.)
└── middleware.ts           # i18n middleware
messages/
├── en.json                # English translations
└── zh.json                # Chinese translations
```

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register a new user |
| `/api/auth/login` | POST | Login |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/me` | GET | Get current user |
| `/api/categories` | GET/POST | List/create categories |
| `/api/categories/[id]` | PATCH/DELETE | Update/delete category |
| `/api/skills` | GET | List skills (search, filter, sort, paginate) |
| `/api/skills/create` | POST | Create skill from scratch |
| `/api/skills/upload` | POST | Upload skill as ZIP |
| `/api/skills/[id]` | GET/PATCH/DELETE | Get/update/delete skill |
| `/api/skills/[id]/star` | POST/DELETE | Star/unstar skill |
| `/api/skills/[id]/download` | GET | Download skill as ZIP |
| `/api/skills/[id]/files` | GET | List skill file tree |
| `/api/skills/[id]/files/[...path]` | GET/PUT | Read/write skill files |
| `/api/skills/[id]/author-skills` | GET | Other skills by same author |
| `/api/dashboard/stats` | GET | Dashboard statistics |

## License

MIT
