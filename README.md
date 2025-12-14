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

# Start development server
npm run dev

# Start development server with persisted db
npm run dev -- --remote
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
| `/posts/[slug]` | Individual post page             |

## ⌨️ Editor Shortcuts

| Action  | Shortcut      |
| ------- | ------------- |
| Heading | `CMD+SHIFT+H` |
| List    | `CMD+SHIFT+L` |
| Code    | `CMD+SHIFT+C` |
| Quote   | `CMD+SHIFT+Q` |
| Divider | `CMD+SHIFT+D` |

_Use `CTRL` instead of `CMD` on Windows/Linux_

## 📚 Documentation

- **[FEATURES.md](./FEATURES.md)** - Complete feature list
- **[EDITOR_GUIDE.md](./EDITOR_GUIDE.md)** - How to use the editor
- **[EDITOR_IMPLEMENTATION.md](./EDITOR_IMPLEMENTATION.md)** - Editor.js details
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture overview

## 🏗️ Tech Stack

- **Framework**: [Astro](https://astro.build) - Static generation + SSR
- **Editor**: [Editor.js](https://editorjs.io) - Block-based content editing
- **Language**: TypeScript & Astro components
- **Styling**: Scoped CSS in components
- **Database**: In-memory (ready for Astro DB migration)

## 📁 Project Structure

```
src/
├── components/
│   ├── Editor.client.ts        # Editor.js integration
│   └── blocks/                 # Block type renderers
├── lib/
│   └── db.ts                   # Data store & functions
└── pages/
    ├── admin/                  # Admin interface
    ├── general/                # Public posts area
    └── index.astro             # Homepage
```

## 🚀 Building for Production

```bash
# Build the static site
npm run build

# Preview the build locally
npm run preview
```

## 🧪 Testing

### Unit tests (Vitest)

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

### E2E smoke tests (Playwright)

Install browser binaries once:

```bash
npx playwright install --with-deps chromium
```

Run the smoke suite:

```bash
npm run test:e2e
```

Notes:

- The E2E suite starts the app automatically and uses a dedicated SQLite DB at `.db/e2e.sqlite`.
- Generated Playwright artifacts (like `test-results/`) are ignored via `.gitignore`.

## 🛠️ Customization

### Styling

Edit component styles in `src/components/` files. Each component has scoped CSS.

### Block Types

Add new block types:

1. Create component in `src/general/components/blocks/NewBlock.astro`
2. Add to Editor.js in `src/admin/components/Editor.client.ts`
3. Add case to BlockRenderer in `src/general/components/blocks/BlockRenderer.astro`

### Database

Local development defaults to Astro DB's ephemeral `.astro/content.db`, which is recreated on each restart. To keep a persistent SQLite file instead, set up a local development database:

1. **Configure the connection**
   - Create or update `.env` with `ASTRO_DB_REMOTE_URL=file:./db/dev.sqlite`.
2. **Create the SQLite file**
   - Run `mkdir -p .db && touch .db/dev.sqlite` to ensure the file exists.
3. **Push the schema**
   - Execute `npx astro db push --remote` to create the `Posts` table in the new database.
4. **(Optional) Seed sample data**
   - Copy `db/seed.ts.backup` to `db/seed.ts`, then run `npx astro db execute db/seed.ts --remote`.
5. **Use the remote flag in dev**
   - Start the dev server with `npm run dev -- --remote` (or `npx astro dev --remote`).

With this setup, Astro connects to `.db/dev.sqlite` and preserves your data between restarts.

## 🔄 Workflow Examples

### Example 1: Blog Post

```
1. Go to /admin/new-post
2. Add heading "My First Post"
3. Add paragraph with intro
4. Add image
5. Add paragraph with body
6. Add code block for example
7. Add quote for emphasis
8. Click Save → Publish
```

### Example 2: Tutorial

```
1. Create post "Getting Started"
2. Add heading "Introduction"
3. Add paragraph
4. Add heading "Step 1"
5. Add ordered list of steps
6. Add code blocks for examples
7. Add heading "Conclusion"
8. Publish
```

## 🛣️ Roadmap

- [ ] Astro DB for persistent storage
- [ ] User authentication
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
