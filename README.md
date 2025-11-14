# GWTree

Git worktree manager for parallel development with coding agents.

## Installation

```bash
pnpm install
pnpm build
pnpm link --global
```

## Usage

Run from any git repository:

```bash
gwtree
# or
gwt
```

The CLI will interactively ask you:
- **Worktree name**: Name for the new worktree directory (default: `{repo-name}-worktree`)
- **Branch**: Which branch to checkout in the worktree
- **Open in editor**: Whether to open the worktree in an editor
- **Editor choice**: VS Code or your default editor ($EDITOR)

## Features

- Creates git worktrees outside your current repository
- Interactive prompts with validation
- Branch selection from existing branches
- Auto-open in VS Code or default editor
- Perfect for running multiple coding agents in parallel

## Development

```bash
pnpm dev      # Watch mode
pnpm build    # Build
pnpm test     # Run tests
```

## Commands

- `gwtree` or `gwt` - Create a new worktree (default command)
- `gwtree -v` or `gwtree --version` - Show version
- `gwtree -h` or `gwtree --help` - Show help
