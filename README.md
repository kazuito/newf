# newf

Create new files and folders from the command palette. Fast, with brace expansion.

---

## Installation

Search for **newf** in the VS Code extension marketplace, or install from the command line:

```sh
code --install-extension newf
```

## Usage

Open the command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run:

```
Newf: Create New File
```

1. Select a target directory from the quick pick list.
2. Enter a file name or pattern.
3. The file is created and opened in the editor.

Directories are created automatically. If the file already exists, it is opened without overwriting.

## Brace Expansion

newf supports full brace expansion, so you can create multiple files in a single command.

**Comma-separated lists**

```
components/{Header,Footer,Sidebar}.tsx
```

Creates `components/Header.tsx`, `components/Footer.tsx`, and `components/Sidebar.tsx`.

**Numeric ranges**

```
pages/page-{01..05}.md
```

Creates `pages/page-01.md` through `pages/page-05.md`.

**Nested patterns**

```
src/{components/{Button,Input},hooks/use{Auth,Theme}}.ts
```

Creates four files across two directories.

**Multiple entries**

Separate unrelated files with commas at the top level:

```
README.md, LICENSE, src/index.ts
```

There is a safety limit of 100 expanded files per command.

## Directory Listing

The quick pick menu shows all directories in your workspace. In git repositories, it uses `git ls-files` to respect your `.gitignore`. Non-git projects fall back to a filesystem walk that excludes hidden directories and `node_modules`.

The root directory (`.`) is always available.

## Security

Path traversal is blocked. Inputs like `../../etc/passwd` that resolve outside the selected base directory are rejected.

## Requirements

- VS Code 1.110.0 or later

## Development

```sh
pnpm install
pnpm compile      # Build
pnpm watch        # Build in watch mode
pnpm lint         # Lint and format check (Biome)
pnpm test         # Compile, lint, and run tests
pnpm typecheck    # Type check without emitting
```

## License

MIT
