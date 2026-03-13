# AGENTS.md

## Project overview

**newf** is a VS Code extension that lets users quickly create new files and folders from the command palette. It registers two commands:
- `newf.newFile` — "Create New File": pick a directory, then type a file name/pattern
- `newf.newFileAtRoot` — "Create New File at Path": skip the directory picker, type a path relative to workspace root

Both commands support brace expansion (e.g. `{a,b}.md`, `{01..05}.md`).

## Tech stack

- TypeScript, targeting ES2022
- VS Code Extension API (^1.110.0)
- Node.js built-in modules (`node:fs`, `node:path`)
- Package manager: **pnpm**

## Project structure

```
src/
  extension.ts        — All extension logic (activation, command handlers)
  filesystem.ts       — Directory discovery and file creation
  parsing.ts          — Brace expansion parsing
  test/
    extension.test.ts — Command registration tests (Mocha + @vscode/test-cli)
    filesystem.test.ts
    parsing.test.ts
out/                  — Compiled JS output (do not edit)
```

## Key commands

```sh
pnpm compile   # Compile TypeScript to out/
pnpm watch     # Compile in watch mode
pnpm lint      # Biome check (lint + format) on src/
pnpm format    # Biome format (auto-fix) on src/
pnpm test      # Run tests (compiles + lints first)
pnpm typecheck # Check types (Run after make changes)
```

## How the extension works

### `newf.newFile` (Create New File)
1. Validates that a workspace is open.
2. Loads the directory list via `getDirectories()` (git-aware, falls back to filesystem walk).
3. Shows a `createQuickPick` with the active file's directory pre-selected.
4. Shows an input box with live brace-expansion preview (`validateInput` shows "Will create N files").
5. Expands the pattern with `expandInput()`, creates files via `createFile()`, opens the result.

When invoked from the Explorer right-click context menu on a folder, receives a `contextUri` and skips the directory picker.

### `newf.newFileAtRoot` (Create New File at Path)
Same as above but skips the directory picker entirely — paths are resolved from the workspace root.

### Shared helpers (in `extension.ts`)
- `pickDirectory(rootPath, dirs)` — `createQuickPick` wrapper with active-file pre-selection
- `runCreate(basePath, input)` — expands input, creates files, opens result; shared by both commands
- `patternValidateInput` — `validateInput` callback: shows file count (Info) or parse error (Error)

## Conventions

- Use `node:` protocol for Node.js built-in imports (e.g. `"node:fs"` not `"fs"`).
- Imports must be sorted alphabetically.
- Biome enforces formatting (2-space indent, semicolons). Run `pnpm format` after changes.
- Commands are registered in `activate()` and pushed to `context.subscriptions`.
