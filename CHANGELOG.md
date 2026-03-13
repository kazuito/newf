# Change Log

All notable changes to the "newf" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.4] - 2026-03-14

### Changed

- Bundle the extension with Rolldown before publishing and compile tests into `out-test/`
- Move bundled runtime dependencies like `brace-expansion` into `devDependencies` and add a dedicated `pnpm package` script for VSIX builds
- Refresh README and AGENTS.md to document the current build, test, and packaging workflow

### Fixed

- Exclude test output, local environment files, workspace metadata, and other dev-only assets from published VSIX packages
- Add publishing tests so package contents and publish workflow stay aligned

## [0.0.2] - 2026-03-14

### Added

- File templates via `newf.templates`, including `${name}`, `${basename}`, `${ext}`, `${dir}`, `${workspaceFolder}`, and `${date}` placeholders
- `newf.openAfterCreate` setting to open the last created file, all created files, or none
- Workspace root selection when multiple folders are open
- Inline directory creation from the directory picker
- Localization for commands, prompts, validation messages, and settings

### Changed

- Explorer context actions now work from both folders and files, using the file's parent directory when needed
- Validation previews now distinguish files and folders and show a short path preview for multi-create patterns

## [0.0.1] - 2026-03-13

### Added

- `Newf: Create New File` command — pick a directory, enter a file name or brace-expansion pattern
- `Newf: Create New File at Path` command — enter a path relative to the workspace root
- Brace expansion: comma lists (`{a,b,c}`), numeric ranges (`{01..05}`), nested patterns
- Git-aware directory listing via `git ls-files`; falls back to filesystem walk for non-git projects
- Explorer context menu entry on folders for `Create New File`
- Safety limit of 100 expanded files per command
- Path traversal protection
