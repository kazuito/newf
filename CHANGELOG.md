# Change Log

All notable changes to the "newf" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.1] - 2026-03-13

### Added

- `Newf: Create New File` command — pick a directory, enter a file name or brace-expansion pattern
- `Newf: Create New File at Path` command — enter a path relative to the workspace root
- Brace expansion: comma lists (`{a,b,c}`), numeric ranges (`{01..05}`), nested patterns
- Git-aware directory listing via `git ls-files`; falls back to filesystem walk for non-git projects
- Explorer context menu entry on folders for `Create New File`
- Safety limit of 100 expanded files per command
- Path traversal protection