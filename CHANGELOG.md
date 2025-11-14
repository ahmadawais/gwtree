# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-11-14

### Added
- 🚀 Initial release of GWTree
- ✨ Interactive worktree creation with smart defaults
- 🎯 Quick suffix editing with ESC for full name customization
- 🔍 List and manage worktrees interactively
- 🗑️ Delete worktrees with confirmation
- ⚙️ Configurable defaults via `~/.config/gwtree/config.json`
- 🎨 Clean UX with dimmed prefixes and minimal prompts
- 🔄 Auto branch creation with unique names
- 📝 Support for VS Code, default editor, or no editor
- 🌳 Smart branch selection (main/master default)
- 🎨 ASCII banner for CLI branding

### Features
- `gwtree` / `gwt` - Create new worktree (default command)
- `gwtree list` / `gwt ls` - List and manage worktrees
- `gwtree remove` / `gwt rm` - Remove a worktree
- Pattern-based naming: `{repo}-{branch}-wt-{suffix}`
- Automatic branch conflict resolution
- Interactive search and selection
- ESC to cancel or switch to full edit mode

### Configuration
- Default branch choice (current/new)
- Default suffix (customizable)
- Default editor (code/default/none)
- Name pattern template

[1.0.0]: https://github.com/ahmadawais/gwtree/releases/tag/1.0.0
