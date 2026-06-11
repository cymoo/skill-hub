# Skill Hub

An open platform for uploading, managing, sharing, and discovering AI Agent Skills.

## Features

- 🔐 **User Authentication** — Register, login with JWT + HttpOnly cookies
- 📦 **Skill Management** — Upload (ZIP), create, edit, delete skills
- 🏷️ **Version History** — Semantic versioning (semver) per skill; each ZIP upload creates an immutable snapshot; browse or download any historical version
- 🔍 **Search & Filter** — Full-text search, filter by category/owner, sort by date/stars
- ⭐ **Star System** — Star your favorite skills (optimistic updates)
- 📄 **README Rendering** — Full Markdown rendering with syntax highlighting
- 📁 **File Browser** — Browse and edit the latest skill files; read-only browsing for historical versions
- 📥 **Download** — Download the latest or any specific version as a ZIP
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
   The auth cookie `secure` flag is resolved in this order: `x-forwarded-proto` (proxy) → current request protocol → `NEXT_PUBLIC_APP_URL` protocol → `NODE_ENV` fallback. For `NEXT_PUBLIC_APP_URL`, `https://` enables `secure`, while `http://` disables it.

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

## Versioning

Each skill supports a full version history. Versions are created exclusively by uploading a ZIP file — online file editing does not generate a new version.

### Uploading a new version

When uploading a ZIP from the Dashboard, fill in:

| Field | Required | Description |
|-------|----------|-------------|
| `version` | ✅ | Semantic version string, e.g. `1.0.0`, `2.1.0-beta.1` |
| `changelog` | — | Optional notes describing what changed in this version |

Rules:
- Version strings must follow [semver](https://semver.org/) (`MAJOR.MINOR.PATCH[-pre][+build]`).
- Each version is unique per skill — uploading the same version number again returns a conflict error.
- Uploading a new version replaces the skill's working directory (latest files) and saves an immutable file snapshot.

### Storage layout

```
data/skills/
├── {userId}/{skillName}/               ← latest working files (editable online)
└── __skill_versions/{skillId}/
    ├── 1.0.0/                          ← version snapshot (read-only)
    └── 1.1.0/
```

### Deleting versions

- The **latest** version cannot be deleted. To remove it, upload a newer version first.
- The **only** version of a skill cannot be deleted. Delete the whole skill instead.
- Deleting a skill removes all its version snapshots automatically.

## Project Structure

```
src/
├── app/
│   ├── [locale]/                  # i18n route group
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Home page
│   │   ├── auth/                  # Login & register
│   │   ├── dashboard/             # User dashboard (upload form includes version/changelog)
│   │   └── skills/[id]/           # Skill detail (Readme / Files / Versions / Author tabs)
│   └── api/                       # API routes
│       ├── auth/                  # Auth endpoints
│       ├── categories/            # Category CRUD
│       ├── skills/
│       │   ├── [id]/
│       │   │   ├── versions/      # Version list
│       │   │   │   └── [version]/ # Version delete, download, read-only file browser
│       │   │   ├── files/         # Latest file tree & read/write
│       │   │   ├── star/          # Star/unstar
│       │   │   ├── download/      # Download latest ZIP
│       │   │   └── author-skills/ # Other skills by author
│       │   ├── create/            # Create skill from scratch
│       │   └── upload/            # Upload ZIP (version + changelog required)
│       └── dashboard/             # Dashboard stats
├── components/
│   ├── ui/                        # Base UI components
│   └── layout/                    # Header, footer, locale switcher
├── db/
│   ├── schema.ts                  # Drizzle ORM schema (skills + skill_versions + stars)
│   ├── index.ts                   # Database client
│   └── seed.ts                    # Seed script
├── i18n/                          # Internationalization config
├── lib/                           # Utilities (auth, storage, validators, etc.)
└── middleware.ts                  # i18n middleware
messages/
├── en.json                        # English translations
└── zh.json                        # Chinese translations
```

## API Reference

### Auth
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register a new user |
| `/api/auth/login` | POST | Login |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/me` | GET | Get current user |

### Categories
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/categories` | GET/POST | List/create categories |
| `/api/categories/[id]` | PATCH/DELETE | Update/delete category |

### Skills
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/skills` | GET | List skills (search, filter, sort, paginate) |
| `/api/skills/create` | POST | Create skill from scratch |
| `/api/skills/upload` | POST | Upload skill as ZIP (requires `version` field, semver) |
| `/api/skills/[id]` | GET/PATCH/DELETE | Get/update/delete skill |
| `/api/skills/[id]/star` | POST/DELETE | Star/unstar skill |
| `/api/skills/[id]/download` | GET | Download latest skill as ZIP |
| `/api/skills/[id]/files` | GET/POST | List file tree / create file or directory |
| `/api/skills/[id]/files/[...path]` | GET/PUT/PATCH/DELETE | Read/write/rename/delete skill files |
| `/api/skills/[id]/author-skills` | GET | Other skills by same author |

### Versions
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/skills/[id]/versions` | GET | List all versions (newest first) |
| `/api/skills/[id]/versions/[version]` | DELETE | Delete a specific version (not the latest, not the only one) |
| `/api/skills/[id]/versions/[version]/download` | GET | Download a specific version as ZIP |
| `/api/skills/[id]/versions/[version]/files` | GET | List file tree for a historical version (read-only) |
| `/api/skills/[id]/versions/[version]/files/[...path]` | GET | Read a file from a historical version (read-only) |

### Dashboard
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/stats` | GET | Dashboard statistics |

## License

MIT
