# AGENTS.md

## Project overview

**newf** is a VS Code extension that lets users quickly create new files and folders from the command palette. It registers two commands:
- `newf.newFile` — "Create New File": pick a directory, then type a file name/pattern
- `newf.newFileAtRoot` — "Create New File at Path": skip the directory picker, type a path relative to workspace root

Both commands support brace expansion (e.g. `{a,b}.md`, `{01..05}.md`), workspace-scoped templates via `newf.templates`, and automatic opening behavior via `newf.openAfterCreate`. Explorer context actions work from both folders and files.

## Tech stack

- TypeScript, targeting ES2022
- VS Code Extension API (^1.100.0)
- Node.js built-in modules (`node:fs`, `node:path`)
- Rolldown for bundling the published extension output
- Mocha-based extension tests via `@vscode/test-cli`
- Package manager: **pnpm**

## Project structure

```
src/
  commands/
    newFileCommand.ts       — Directory picker flow and inline directory creation
    newFileAtRootCommand.ts — Workspace-root creation flow
  extension.ts              — Command registration
  filesystem.ts             — Git-aware directory discovery and safe file/folder creation
  parsing.ts                — Brace expansion parsing
  pickWorkspaceRoot.ts      — Multi-root workspace picker
  runCreate.ts              — Creation flow, editor opening, undo, and notifications
  template.ts               — Template matching and placeholder substitution
  test/
    extension.test.ts — Command registration tests
    filesystem.test.ts
    newFileCommand.test.ts
    parsing.test.ts
    publish.test.ts
    runCreate.test.ts
    template.test.ts
    validate.test.ts
  validate.ts               — Input validation and creation preview text
out/                  — Compiled JS output (do not edit)
out-test/             — Compiled test JS output (do not edit)
rolldown.config.mjs   — Extension bundle configuration
```

## Key commands

```sh
pnpm bundle        # Bundle the extension to out/
pnpm compile:tests # Compile tests to out-test/
pnpm compile       # Bundle the extension and compile tests
pnpm watch         # Rebuild the extension bundle in watch mode
pnpm watch:tests   # Recompile tests in watch mode
pnpm lint          # Biome check
pnpm format        # Biome format (auto-fix)
pnpm test          # Run the VS Code test suite (after pretest compile)
pnpm typecheck     # Check types
pnpm package       # Build a VSIX without shipping dependencies
pnpm check         # Run Biome with --write, then the test suite
```

## How the extension works

### Activation
`activate()` in `src/extension.ts` registers `newf.newFile` and `newf.newFileAtRoot`. The command handlers live under `src/commands/`.

### Workspace selection
`pickWorkspaceRoot()` handles three cases:
1. No workspace folder: show an error.
2. Single workspace folder: use it immediately.
3. Multi-root workspace: show a quick pick and return the chosen root.

### `newf.newFileAtRoot` (Create New File at Path)
`newFileAtRootCommand()` skips the directory picker and prompts for a path relative to the selected workspace root. Validation is handled by `patternValidateInput()`.

### `newf.newFile` (Create New File)
`newFileCommand()`:
1. Resolves the workspace root with `pickWorkspaceRoot()`.
2. Uses the Explorer `contextUri` when invoked from the context menu, falling back to `getDirectories()` otherwise.
3. Shows a quick pick with the active editor directory pre-selected.
4. Offers a synthetic **Create directory** entry when the typed directory does not exist yet.
5. Prompts for the file/folder pattern with live brace-expansion preview.
6. Passes control to `runCreate()`.

When invoked from the Explorer context menu on a file, it uses the file's parent directory.

### Shared helpers
- `runCreate(workspaceRoot, basePath, input)` — expands patterns, applies templates, creates files/folders, respects `newf.openAfterCreate`, and offers undo for newly created files
- `patternValidateInput` — `validateInput` callback that previews file/folder counts plus the first few expanded paths; returns `null` (no message) for a single plain file name, but still shows a message for a single folder intent (trailing `/`)
- `createFile(basePath, rawFileName, content)` — creates files or folders, auto-creates parent directories, and blocks path traversal outside the base path
- `resolveTemplate(relativePath, templates, workspaceFolder)` — first-match template lookup with `${name}`, `${basename}`, `${ext}`, `${dir}`, `${workspaceFolder}`, and `${date}` placeholders
- `getDirectories(rootPath)` — uses `git ls-files` to respect `.gitignore`, falling back to a filesystem walk outside git repos

## Conventions

- Use `node:` protocol for Node.js built-in imports (e.g. `"node:fs"` not `"fs"`).
- Imports must be sorted alphabetically.
- Biome enforces formatting (2-space indent, semicolons). Run `pnpm format` after changes.
- Commands are registered in `activate()` and pushed to `context.subscriptions`.
- The published extension is bundled, so runtime libraries that are fully rolled into `out/extension.js` can stay in `devDependencies`.
- Packaging and publish behavior are guarded by `.vscodeignore`, `rolldown.config.mjs`, and `src/test/publish.test.ts`.
