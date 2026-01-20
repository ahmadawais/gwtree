# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-20

### Breaking Changes
- **Renamed prompt**: "Branch name:" is now "Worktree & branch name:" — same name used for both
- **New naming pattern**: `{repo}-{name}` instead of `{repo}-{branch}-wt-{suffix}`
- **ESC behavior**: Press ESC to set worktree and branch names separately
- **Removed**: `remove` command replaced by `rm`

### Added
- **Batch creation**: `gwt a b c` creates multiple worktrees at once
- **Status dashboard**: `gwt status` shows changes, commits ahead/behind, merge status
- **Smart cleanup**: `gwt clean` removes merged worktrees, `gwt clean --all` removes all
- **Merge helper**: `gwt merge <name>` merges branch to main and cleans up
- New compact UI with `└` bracket style output
- Full command transparency — see every git command as it runs
- Full path shown after Create step
- `-x` / `--no-editor` flag to skip opening editor
- `gwt config` command to open config file
- `gwt config reset` to reset defaults
- 77 passing tests with 80% coverage
- Command aliases: `rm`/`remove`, `status`/`st`, `clean`/`c`, `merge`/`m`

### Changed
- Tighter output spacing with unified timeline
- Truncated paths in commands for readability (`.../worktree-name`)
- Brief descriptions under each step
- Green `◆` for completed steps, red for errors

## [1.1.2] - 2025-11-14

### Added
- Project image asset

### Changed
- Updated README with image banner

## [1.1.1] - 2025-11-14

### Changed
- Redesigned README with clean minimal Apple-like aesthetic

## [1.1.0] - 2025-11-14

### Added
- Comprehensive Vitest test suite with 88.7% coverage
- 34 passing tests across all core functionality

### Changed
- Improved command lingo and user-facing text
- Enhanced documentation clarity

## [1.0.0] - 2025-11-14

### Added
- Initial release
- Interactive worktree creation with smart defaults
- List and delete worktrees interactively
- Remove worktree command
- Configurable defaults via `~/.config/gwtree/config.json`
- Smart naming pattern: `{repo}-{branch}-wt-{suffix}`
- Auto branch creation for unique worktree branches
- Command aliases: `gwt`, `gwt ls`, `gwt rm`
- Editor integration (VS Code, default editor)
- Search and filter in worktree list

[2.0.0]: https://github.com/ahmadawais/gwtree/compare/v1.1.2...v2.0.0
[1.1.2]: https://github.com/ahmadawais/gwtree/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/ahmadawais/gwtree/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/ahmadawais/gwtree/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/ahmadawais/gwtree/releases/tag/v1.0.0
