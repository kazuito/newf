# AGENTS.md

## Project overview

**newf** is a VS Code extension that lets users quickly create new files and folders from the command palette. It registers a single command `newf.create` (titled "Create New File").

## Tech stack

- TypeScript, targeting ES2022
- VS Code Extension API (^1.110.0)
- Node.js built-in modules (`node:fs`, `node:path`)
- Package manager: **pnpm**

## Project structure

```
src/
  extension.ts        — All extension logic (activation, command handler)
  test/
    extension.test.ts — Tests (Mocha + @vscode/test-cli)
out/                  — Compiled JS output (do not edit)
```

The entire extension lives in `src/extension.ts`. There is no multi-file architecture yet.

## Key commands

```sh
pnpm compile   # Compile TypeScript to out/
pnpm watch     # Compile in watch mode
pnpm lint      # ESLint on src/
pnpm test      # Run tests (compiles + lints first)
pnpm typecheck # Check types (Run after make changes)
```

## How the extension works

1. `activate()` registers the `newf.create` command.
2. The command handler (`createFileCommand`) runs this flow:
   - Shows a quick pick of top-level directories in the workspace (plus `.` for root). Hidden directories (starting with `.`) are excluded.
   - Shows an input box for the file name/path.
   - Strips a leading `/` if present, then resolves the path relative to the selected directory.
   - Creates any intermediate directories with `mkdir({ recursive: true })`.
   - Creates the file (empty) if it doesn't already exist.
   - Opens the file in the editor.

## Conventions

- Use `node:` protocol for Node.js built-in imports (e.g. `"node:fs"` not `"fs"`).
- Imports must be sorted alphabetically.
- Tabs for indentation, semicolons required, strict equality (`===`).
- Commands are registered in `activate()` and pushed to `context.subscriptions`.
