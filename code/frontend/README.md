# Frontend

The Nail Salon website frontend, built with [Next.js](https://nextjs.org) (App Router), React, TypeScript, and Tailwind CSS.

> This project uses Next.js 16, which differs from older versions. Check the docs bundled in `node_modules/next/dist/docs/` before relying on older tutorials.

## Getting Started

Requires Node.js 20.9+ and npm (the minimum for Next.js 16).

```bash
cd code/frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The page reloads as you save files.

The admin pages (`/admin/login`, `/admin`) need the database and the API running too (see Setup in `../README.md`, then `npm run dev` in `code/api`). Requests to `/api/*` are forwarded to the API by a rewrite in `next.config.ts`; set `API_URL` in `.env.local` (see `.env.example`) if it is not on `http://localhost:3001`.

**Production:** set `API_URL` in Vercel's environment variables to the API's public URL. Rewrites are built at build time, so redeploy after changing it.

## Scripts

| Command                | What it does                            |
| ---------------------- | --------------------------------------- |
| `npm run dev`          | Start the development server            |
| `npm run build`        | Create a production build               |
| `npm run start`        | Serve the production build              |
| `npm run lint`         | Run ESLint                              |
| `npm run format`       | Format all files with Prettier          |
| `npm run format:check` | Check formatting without changing files |

Run `npm run format` and `npm run lint` before committing.

## Project Structure

```text
frontend/
|-- app/
|   |-- layout.tsx        Root HTML layout, fonts, and page metadata
|   |-- page.tsx          Home page: assembles the section components
|   |-- globals.css       Tailwind import and site-wide styles
|   `-- admin/            Admin pages: page.tsx (signed-in page), login/, LogoutButton.tsx
|-- components/           One file per page section or reusable piece
|   |-- Navigation.tsx
|   |-- Header.tsx
|   |-- Hero.tsx
|   |-- Section.tsx       Reusable full-width section wrapper
|   `-- Footer.tsx
|-- lib/
|   |-- admin-session.ts  getAdminSession() / requireAdminPage(): asks the API who is signed in
|   `-- site.ts           Site name, tagline and description
|-- styles/               CSS modules, one per component (e.g. Header.module.css)
|-- proxy.ts              Sends /admin visitors with no session cookie to /admin/login
`-- next.config.ts        Cache Components, Tailwind loader rule, /api/* rewrite to API_URL
```

## Adding a Section

1. Create `components/MySection.tsx` and, if needed, `styles/MySection.module.css`.
2. Wrap its content in `Section` to get full-width layout, consistent spacing, and an optional background image:

   ```tsx
   import Section from "@/components/Section";

   export default function Services() {
     return (
       <Section id="services" backgroundImage="/services-bg.jpg">
         <h2>Our Services</h2>
       </Section>
     );
   }
   ```

3. Import it in `app/page.tsx` and place it inside `<main>`.

The `id` lets navigation links jump to the section (`href="#services"`).

## Styling

- **CSS modules** (`styles/*.module.css`) hold component-specific styles. Import them with `import styles from "@/styles/Name.module.css"` and use `className={styles.name}`.
- **Tailwind** utility classes can be used directly in `className` for quick layout and spacing.
- Prefer `rem` for sizes and spacing, and `px` for borders.

## Notes

- **Admin pages:** start every page under `app/admin/` with `const { admin, csrfToken } = await requireAdminPage();` (from `@/lib/admin-session`). Call the API at `/api/admin/...` and send `csrfToken` as the `x-csrf-token` header on POST/PATCH/DELETE. The API is what actually protects the data.

- **Cache Components** (`cacheComponents` in `next.config.ts`) is enabled. Values that change between renders, such as `new Date()`, must be wrapped in a `"use cache"` component (see `CopyrightYear` in `components/Footer.tsx`) or computed at request time.
- The Tailwind loader rule in `next.config.ts` skips `*.module.css` files so CSS modules keep working. Restart `npm run dev` after editing `next.config.ts`.
- Put images in `public/` (create the folder; it does not exist yet) and reference them as `/image.jpg`. Prefer `next/image` for real photos.
