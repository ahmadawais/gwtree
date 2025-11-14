# GWTree

> Git worktree manager for parallel development with coding agents

Create and manage git worktrees effortlessly. Perfect for running multiple coding agents (Command, Claude, Cursor, etc.) in parallel on different branches.

## Installation

```bash
npm install -g gwtree
```

## Usage

### Create Worktree

```bash
gwtree
# or
gwt
```

Interactive prompts:
1. **Branch**: Select main/master or create new branch
2. **Worktree name**: Quick edit suffix (e.g., `gwtree-main-wt-1`) or press ESC for full name customization
3. **Open in**: Choose VS Code, default editor, or skip

### List & Delete Worktrees

```bash
gwtree list
# or
gwt ls
```

Interactively browse and delete worktrees with arrow keys and search.

### Remove Worktree

```bash
gwtree remove
# or
gwt rm
```

## Features

- 🚀 **Quick worktree creation** - Minimal prompts, smart defaults
- 🎯 **Smart naming** - Pattern: `{repo}-{branch}-wt-{suffix}`
- 🔍 **Interactive management** - List, search, and delete worktrees
- ⚙️ **Configurable defaults** - Customize via `~/.config/gwtree/config.json`
- 🎨 **Clean UX** - Dimmed prefixes, ESC for full control
- 🔄 **Auto branch creation** - Unique branch names for each worktree

## Configuration

Defaults stored in `~/.config/gwtree/config.json`:

```json
{
  "defaultBranchChoice": "current",
  "defaultSuffix": "1",
  "defaultEditor": "code",
  "namePattern": "{repo}-{branch}-wt-{suffix}"
}
```

## Commands

- `gwtree` / `gwt` - Create new worktree (default)
- `gwtree list` / `gwt ls` - List and manage worktrees
- `gwtree remove` / `gwt rm` - Remove a worktree
- `gwtree -v` / `--version` - Show version
- `gwtree -h` / `--help` - Show help

## Why GWTree?

Perfect for parallel development workflows:
- Run Command Code, Claude and Codex simultaneously on different features
- Test changes across multiple branches
- Keep main branch clean while experimenting
- Quick context switching without stashing

## License

MIT License © 2025 Ahmad Awais
