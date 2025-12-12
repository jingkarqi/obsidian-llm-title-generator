# Repository Guidelines

## Project Structure & Module Organization

- `src/`: TypeScript source for the Obsidian plugin.
  - `src/main.ts`: plugin entrypoint (registers settings, commands, and menus).
  - `src/settings.ts`: settings model + settings tab UI (stores to `data.json` in the vault).
  - `src/services/`: core logic (`llm/`, `title/`, `rename/`).
  - `src/workflows/`: orchestration (generate titles -> rename files).
  - `src/ui/`: modals and user prompts.
- `manifest.json`: Obsidian plugin metadata.
- `styles.css`: plugin styles.
- `esbuild.config.mjs`: bundler config; generates `main.js` (gitignored).
- `versions.json` + `version-bump.mjs`: release metadata/version sync.

## Build, Test, and Development Commands

- `npm install`: install dependencies.
- `npm run dev`: watch build; writes `main.js` with inline sourcemaps for local debugging.
- `npm run build`: TypeScript typecheck (`tsc -noEmit`) + production bundle/minify via esbuild.
- `npm run version`: updates `manifest.json`/`versions.json` to match `package.json` version and stages them.
- Lint (no script defined): `npx eslint src --ext .ts`

## Coding Style & Naming Conventions

- Indentation: tabs, width 4; line endings: LF (see `.editorconfig`).
- Keep source in `src/`; treat `main.js` as generated output (do not hand-edit).
- Naming: `camelCase.ts` files, `PascalCase` for classes, `camelCase` for functions/variables.
- Obsidian paths are forward-slash based; avoid OS-specific path joining for `TFile.path`.

## Testing Guidelines

No automated test suite is configured. Validate changes by running in Obsidian:

1. `npm run build`
2. Copy `manifest.json`, `styles.css`, and the built `main.js` into `<Vault>/.obsidian/plugins/llm-title-generator/`
3. Reload Obsidian and test: single-file, multi-select, and vault-wide flows (including batch limits, delays, and timeouts).

## Commit & Pull Request Guidelines

- Commit messages commonly use Conventional Commit-style prefixes (e.g., `feat:`, `fix:`, `docs:`, `build:`); keep subjects short and imperative.
- PRs should include: summary, test steps (commands + expected behavior), and screenshots if settings/modals change.
- Never commit secrets or local plugin state: `data.json` is intentionally gitignored.

## Security & Configuration Tips

- The plugin sends note snippets to the configured `baseUrl`; be cautious when testing with sensitive content.
- API keys are stored locally in `<Vault>/.obsidian/plugins/llm-title-generator/data.json` (not encrypted); keep it out of logs/screenshots.
