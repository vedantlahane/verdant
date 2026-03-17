# Verdant — Where architecture grows

A developer-first tool that turns simple text into interactive 3D architecture diagrams. Describe your system in `.vrd` syntax or plain English, and watch it bloom into a beautiful 3D visualization.

## Features

- **Syntax you already know** — `.vrd` feels familiar if you've written YAML
- **3D visualization** — Interactive 3D diagrams powered by Three.js and React Three Fiber
- **Text-to-diagram** — Convert system descriptions into living architecture maps
- **Dynamic theming** — Automatic accent color sync across UI and cursor
- **Developer-friendly** — Built for engineers, by engineers

## Project Structure

```
verdant/
├── apps/
│   └── playground/          # Next.js demo app & landing page
│       ├── src/
│       │   ├── app/         # Next.js app router & globals
│       │   ├── features/    # Landing & playground UI
│       │   └── public/      # Static assets
│       └── package.json
├── packages/
│   ├── components/          # React components for 3D nodes/edges
│   ├── parser/              # .vrd syntax parser
│   └── renderer/            # React Three Fiber renderer
├── pnpm-workspace.yaml      # Monorepo config
├── turbo.json               # Turborepo build orchestration
└── tsconfig.json            # Root TypeScript config
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+ ([install](https://pnpm.io/installation))

### Installation

```bash
# Clone and install dependencies
pnpm install

# Run the playground in dev mode
cd apps/playground
pnpm dev
```

The playground will open at `http://localhost:3000`.

### Build

```bash
# Build all packages and apps
pnpm build

# Build specific workspace
cd packages/parser && pnpm build
```

## Key Packages

### `@verdant/components`
React components for rendering architecture nodes (Server, Database, Cache, etc.) and edges in a canvas-based diagram.

**Usage:**
```tsx
import { ServerNode, DatabaseNode } from "@verdant/components";
```

### `@verdant/parser`
Parses `.vrd` syntax and plain text descriptions into an architecture AST.

**Usage:**
```ts
import { parse } from "@verdant/parser";
const ast = parse("server -> database");
```

### `@verdant/renderer`
React Three Fiber-based 3D renderer for architecture diagrams.

**Usage:**
```tsx
import { VerdantRenderer } from "@verdant/renderer";
<VerdantRenderer architecture={ast} />;
```

### `playground` (Next.js App)
Landing page, interactive editor, and AI-powered diagram generation.

**Features:**
- Live `.vrd` editor with syntax highlighting
- 3D preview canvas
- AI modal for natural language → `.vrd` conversion
- Theme toggle (dark/light mode)
- Dynamic leaf cursor (accent color-synced)

## Development

### Scripts

```bash
# Start dev server (playground)
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint + format
pnpm lint
pnpm format
```

### Workspace Structure

Each package is independently buildable:
- Root `package.json` defines workspace commands
- `turbo.json` orchestrates build order and caching
- Each package has its own `tsconfig.json` and `package.json`

### Adding a New Package

1. Create folder under `packages/`
2. Add `package.json` with a unique `name` (e.g., `@verdant/my-pkg`)
3. Create `src/` and `tsconfig.json`
4. Add to `pnpm-workspace.yaml` (auto-linked)

## Recent Enhancements

### Dynamic Leaf Cursor
The cursor is now a dynamic leaf SVG that syncs with your accent color. When you toggle themes, the cursor updates in real time.

**Implementation:** [LeafCursor.tsx](apps/playground/src/features/shared/ui/LeafCursor.tsx)

### LeafRain Animation
Falling leaves that settle into piles on mouse leave now preserve their pile state across re-enters, creating a more natural "rewind" effect.

## Theming

Verdant uses a CSS-based design system with dark/light modes. Key variables:

```css
--accent: Primary brand color (default: #52B788)
--accent-dark: Darker variant
--accent-light: Lighter variant
--page-bg: Page background
--text-primary: Main text color
```

Toggle theme by setting `document.documentElement.dataset.theme = 'light'|'dark'`.

## Performance

- **Tree-shaking:** All packages are ESM-friendly with explicit exports
- **Code splitting:** Playground uses Next.js code splitting for fast loads
- **Canvas rendering:** 3D diagrams use WebGL via Three.js
- **Turbo caching:** Monorepo builds are cached and parallelized

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

WebGL support required for 3D rendering.

## License

Open source. Check individual package files for licensing details.

## Contributing

Issues and PRs welcome. Please run `pnpm lint` and `pnpm test` before submitting.

---

**Made with 🍃 by the Verdant team**
