# Repository Guidelines

Expo + React Native app (`wahala-app-v1`) using Expo Router for file-based routing. Targets iOS, Android, and web from a single TypeScript codebase.

## Project Structure & Module Organization

- `app/` — Expo Router routes. `app/_layout.tsx` is the root stack; `app/(tabs)/` is a tab group with `index.tsx` and `explore.tsx`; `app/modal.tsx` is a modal route. Typed routes are enabled (`app.json` → `experiments.typedRoutes`).
- `components/` — shared UI. `themed-text.tsx` / `themed-view.tsx` consume colors via `hooks/use-theme-color.ts`. Platform-specific variants use the `.ios.tsx` / `.web.ts` suffix (e.g. `components/ui/icon-symbol.ios.tsx`, `hooks/use-color-scheme.web.ts`) — Metro picks the right one per platform.
- `hooks/` — reusable hooks (theme + color scheme).
- `constants/theme.ts` — color palette and font tokens.
- `assets/` — images and fonts referenced from `app.json` (icons, splash).
- `scripts/reset-project.js` — moves the starter into `app-example/` and recreates a blank `app/`.
- Path alias `@/*` maps to the repo root (see `tsconfig.json`).

## Build, Test, and Development Commands

- `npm start` — launch the Expo dev server (`expo start`).
- `npm run ios` / `npm run android` / `npm run web` — start with a specific target.
- `npm run lint` — run `expo lint` (ESLint flat config).
- `npm run reset-project` — scaffold a fresh `app/` directory.

No test runner is configured.

## Coding Style & Naming Conventions

- **TypeScript strict mode** is on (`tsconfig.json`). Prefer typed routes and props.
- **ESLint** via `eslint-config-expo/flat` (`eslint.config.js`); `dist/*` is ignored.
- File names are **kebab-case** (`themed-text.tsx`, `use-theme-color.ts`); React components are **PascalCase** exports.
- Import workspace modules via the `@/` alias rather than long relative paths.
- Use the existing `ThemedText` / `ThemedView` and `useThemeColor` rather than hard-coding colors; extend `constants/theme.ts` when adding tokens.
- Platform variants belong in sibling files with `.ios.tsx`, `.android.tsx`, or `.web.ts(x)` suffixes — do not branch on `Platform.OS` when a file split is cleaner.

## Commit & Pull Request Guidelines

Git history is minimal (single `Initial commit`). Use short, imperative subject lines (~50 chars) and include a body when behavior changes. No PR template is defined.
