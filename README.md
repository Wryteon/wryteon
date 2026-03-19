# 🚀 Wryteon - Modern Block-Based CMS

A sleek, modern blogging CMS built with **Astro** and **Editor.js**, featuring a beautiful admin interface and powerful content creation tools.

![Astro](https://img.shields.io/badge/Built%20with-Astro-FF5D01?style=flat)
![Editor.js](https://img.shields.io/badge/Editor-Editor.js-007ACC?style=flat)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

## ✨ Features

### 📝 Rich Content Editor

- **8 Block Types**: Headings, Paragraphs, Lists, Code, Quotes, Images, Embeds, Delimiters
- **Keyboard Shortcuts**: Fast navigation with `CMD+SHIFT+H`, etc.
- **Drag to Reorder**: Easily organize your content
- **Real-time Preview**: See your formatting as you type
- **Rich Media**: Embed YouTube, Twitter, Instagram, and more

### 🎛️ Admin Dashboard

- **Post Statistics**: See how many posts you have
- **Quick Actions**: Create posts, view all, manage content
- **Responsive Design**: Works on desktop, tablet, mobile
- **Beautiful UI**: Modern gradient design with smooth interactions

### 📱 Frontend

- **Homepage**: Shows all published posts
- **Post Pages**: Beautiful rendering of all content types
- **Responsive**: Mobile-first design that looks great everywhere
- **Fast**: Static generation for instant load times

### 💾 Data Management

- **Draft & Publish**: Save posts as drafts or publish instantly
- **Automatic Metadata**: Tracks creation, update, and publication dates
- **SEO-Friendly**: URL slugs and proper semantic HTML

## 🎯 Quick Start

### Installation

```bash
# Clone or navigate to the project
cd wryteon

# Install dependencies
npm install

# Start development server with the default ephemeral Astro DB
npm run dev

# For a persistent local SQLite database and admin login,
# follow the "Database" section below first, then run:
# npm run dev -- --remote
```

The dev server will start at `http://localhost:4321`

### Creating Your First Post

1. **Go to Admin**: Visit `http://localhost:4321/admin/new-post`
2. **Fill Details**: Enter post title and URL slug
3. **Add Content**: Click `+` to add blocks (heading, paragraph, image, etc.)
4. **Save**: Click "💾 Save Post" → Choose "Published"
5. **View**: Your post appears on the homepage!

## 📖 Admin Pages

| URL               | Purpose                                |
| ----------------- | -------------------------------------- |
| `/admin`          | Dashboard with stats and quick actions |
| `/admin/posts`    | List all posts (edit/delete options)   |
| `/admin/new-post` | Create a new post                      |
| `/admin/[slug]`   | Edit existing post                     |

## 🌐 Public Pages

| URL             | Purpose                          |
| --------------- | -------------------------------- |
| `/`             | Homepage - shows published posts |
| `/[slug]`       | Individual post page             |

## ⌨️ Editor Shortcuts

| Action  | Shortcut      |
| ------- | ------------- |
| Heading | `CMD+SHIFT+H` |
| List    | `CMD+SHIFT+L` |
| Code    | `CMD+SHIFT+C` |
| Quote   | `CMD+SHIFT+Q` |
| Divider | `CMD+SHIFT+D` |

_Use `CTRL` instead of `CMD` on Windows/Linux_

## 🏗️ Tech Stack

- **Framework**: [Astro](https://astro.build) - Static generation + SSR
- **Editor**: [Editor.js](https://editorjs.io) - Block-based content editing
- **Language**: TypeScript & Astro components
- **Styling**: Scoped CSS in components
- **Database**: Astro DB backed by SQLite/libSQL

## 📁 Project Structure

```
src/
├── admin/
│   └── components/             # Admin editor integration
├── general/
│   ├── components/             # Public post renderers
│   └── lib/                    # Rendering helpers
├── layouts/
├── lib/                        # Auth, DB, and upload helpers
└── pages/
   ├── admin/                  # Admin interface
   ├── api/                    # Mutation endpoints
   ├── auth/                   # Login/logout routes
   ├── media/                  # Uploaded media endpoint
   ├── [slug].astro            # Public post page
   └── index.astro             # Homepage
```

## 🚀 Building for Production

```bash
# Build the app in Astro DB remote mode
ASTRO_DB_REMOTE_URL=file:/data/wryteon.sqlite npm run build -- --remote

# Start the production server (uses dist/server/entry.mjs)
# Tip: set HOST=0.0.0.0 when running in Docker.
npm run start
```

## 🐳 Docker (Tier 1)

This project supports a straightforward “run anywhere” Docker deployment (single container + persistent volumes).

### Quick start (recommended)

```bash
docker compose up --build
```

Then open `http://localhost:4321`.

### Run without Compose

Build the image:

```bash
docker build -t wryteon:local .
```

Run with a named Docker volume:

```bash
docker run --rm -p 4321:4321 \
   -e HOST=0.0.0.0 \
   -e PORT=4321 \
   -e ASTRO_DB_REMOTE_URL=file:/data/wryteon.sqlite \
   -e UPLOADS_DIR=/data/uploads \
   -e WRYTEON_ADMIN_EMAIL=admin@example.com \
   -e WRYTEON_ADMIN_PASSWORD=change-me \
   -v wryteon-data:/data \
   wryteon:local
```

Run with a bind mount for easy local inspection:

```bash
mkdir -p "$PWD/.docker-data"
docker run --rm -p 4321:4321 \
   -e HOST=0.0.0.0 \
   -e PORT=4321 \
   -e ASTRO_DB_REMOTE_URL=file:/data/wryteon.sqlite \
   -e UPLOADS_DIR=/data/uploads \
   -e WRYTEON_ADMIN_EMAIL=admin@example.com \
   -e WRYTEON_ADMIN_PASSWORD=change-me \
   -v "$PWD/.docker-data:/data" \
   wryteon:local
```

### Persistence

- Database is stored at `/data/wryteon.sqlite` inside the container (mounted as a volume by `docker-compose.yml`).
- Docker uses Astro DB "remote" mode with a local file URL: `ASTRO_DB_REMOTE_URL=file:/data/wryteon.sqlite`.
- Uploaded images are written to `/data/uploads` and served through `/media/<filename>`.

### Admin user

On container start, the entrypoint will:

1. Run `astro db push` (idempotent)
2. Run `astro db execute db/seed.ts --remote` to create a default admin user if these env vars are set:
   - `WRYTEON_ADMIN_EMAIL`
   - `WRYTEON_ADMIN_PASSWORD`

See `.env.example` for a complete list of supported variables.

> **⚠️ Important**: The `ASTRO_DB_REMOTE_URL` is baked into the server bundle at image build time. If you change it, you must rebuild the Docker image (`docker compose up --build`). The runtime env var only affects `astro db push` and `astro db execute` commands; the SSR server uses the build-time value.

### Migrations and rollbacks

- On every container start, the entrypoint runs `astro db push` against the persistent DB volume. This keeps schema changes forward-only and automatic.
- Recommended release flow: take a DB backup first, deploy new image, then let startup apply schema updates.
- There are no explicit down migrations in this setup. If you must roll back to an older image after a schema change, restore the DB from backup.
- Prefer additive schema changes (add table/column) in one release, and destructive cleanup (drop/rename) in a later release.
- For production hardening, document and test a backup/restore command before each release.

## 🧪 Testing

### Unit tests (Vitest)

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

The upload unit tests cover both the write path and the `/media/<filename>` serving route.

### E2E smoke tests (Playwright)

Install browser binaries once:

```bash
npx playwright install --with-deps chromium
```

Run the smoke suite:

```bash
npm run test:e2e
```

The smoke tests expect the same admin credentials as the seed script:

```bash
export WRYTEON_ADMIN_EMAIL="admin@example.com"
export WRYTEON_ADMIN_PASSWORD="change-me"
npm run test:e2e
```

Notes:

- The E2E suite starts the app automatically and uses a dedicated SQLite DB at `.db/e2e.sqlite`.
- The upload smoke test verifies that `/api/upload` returns a `/media/...` URL and that the image is fetchable and renderable in a published post.
- Generated Playwright artifacts (like `test-results/`) are ignored via `.gitignore`.

## 🛠️ Customization

### Styling

Edit styles in the Astro components under `src/admin/components/`, `src/general/components/`, and `src/pages/`. Each component uses scoped CSS.

### Block Types

Add new block types:

1. Create component in `src/general/components/NewBlock.astro`
2. Add to Editor.js in `src/admin/components/Editor.client.ts`
3. Add case to BlockRenderer in `src/general/components/BlockRenderer.astro`

### Database

Local development defaults to Astro DB's ephemeral `.astro/content.db`, which is recreated on each restart. To keep a persistent SQLite file instead, set up a local development database:

1. **Configure the connection**
   - Create or update `.env` with `ASTRO_DB_REMOTE_URL=file:./data/wryteon.sqlite`.
2. **Create the SQLite file**
   - Run `mkdir -p data && touch data/wryteon.sqlite` to ensure the file exists.
3. **Push the schema**
   - Execute `npx astro db push --remote` to create the app tables in the new database.
4. **Seed sample data**
   - Set `WRYTEON_ADMIN_EMAIL` and `WRYTEON_ADMIN_PASSWORD`, then run `npx astro db execute db/seed.ts --remote`.
   - This creates the initial admin user. If you want to log into `/auth/login`, you need this step or another way to create a user.
5. **Use the remote flag in dev**
   - Start the dev server with `npm run dev -- --remote` (or `npx astro dev --remote`).

With this setup, Astro connects to `data/wryteon.sqlite` and preserves your data between restarts.

### First Local Run

If you want a persistent local DB and a working admin login on your first run, use this sequence:

```bash
cp .env.example .env
mkdir -p data && touch data/wryteon.sqlite
npx astro db push --remote
npx astro db execute db/seed.ts --remote
npm run dev -- --remote
```

Notes:

- `npm run dev` without `--remote` uses Astro DB's ephemeral local database.
- `npm run dev -- --remote` requires `ASTRO_DB_REMOTE_URL` to point to a valid `file:` URL or remote libSQL URL.
- `file:/data/wryteon.sqlite` is the Docker path. For local development in this repo, use `file:./data/wryteon.sqlite`.

## 🔄 Typical Workflow

1. Seed an admin user with the `WRYTEON_ADMIN_*` environment variables set.
2. Open `/auth/login` and sign in.
3. Create or edit a post from `/admin/new-post` or `/admin/posts`.
4. Upload images through the editor; they are stored under `UPLOADS_DIR` and served from `/media/<filename>`.
5. Publish the post and verify it at `/<slug>`.

## 🛣️ Roadmap

- [ ] Media library
- [ ] Post scheduling
- [ ] Categories & tags
- [ ] Search functionality
- [ ] Comments system
- [ ] Social sharing
- [ ] Analytics integration

## 🤝 Contributing

Contributions welcome! Feel free to:

- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## 🙌 Credits

Built with:

- [Astro](https://astro.build)
- [Editor.js](https://editorjs.io)
- Community feedback & inspiration

## 📞 Support

For questions or issues:

1. Check the documentation files
2. Review the code comments
3. Check Editor.js documentation

---

**Ready to start blogging? Create your first post at `/admin/new-post` 🚀**

Made with ❤️ for content creators
