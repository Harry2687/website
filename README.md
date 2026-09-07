# harryzhong.com

Source code for personal website and interactive portfolio: [harryzhong.com](https://harryzhong.com/).

## Technology Stack

- **Framework:** [Astro](https://astro.build/) (Static Site Generation)
- **Interactive Engine:** [DuckDB-WASM](https://duckdb.org/docs/api/wasm/overview) and [Apache Arrow](https://arrow.apache.org/)
- **UI Components:** [React 19](https://react.dev/) and [Lucide React](https://lucide.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Runtime & Package Manager:** [Bun](https://bun.sh/)
- **Linter & Formatter:** [Biome](https://biomejs.dev/)
- **Deployment:** [Cloudflare Pages](https://pages.cloudflare.com/)

## Local Development

Ensure you have [Bun](https://bun.sh/) installed (`>= 1.2.0`).

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Harry2687/website.git
   cd website
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Start the local development server:**
   ```bash
   bun run dev
   ```

4. **Lint and type checks:**
   ```bash
   bun run check
   ```

5. **Build for production:**
   ```bash
   bun run build
   ```

6. **Preview the production build locally:**
   ```bash
   bun run preview
   ```

## Deployment

The site deploys to [Cloudflare Pages](https://pages.cloudflare.com/) directly on git push:

- **Build Command:** `bun install && bun run check && bun run build`
- **Build Output Directory:** `dist`
- **Environment Variables:** `BUN_VERSION = 1`

## Legacy Version

The previous Quarto-based website, R/Python notebooks, and exploratory lab projects are preserved in the git history under tag `v1`:

```bash
git checkout v1
```