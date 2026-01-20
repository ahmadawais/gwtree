<div align="center">

![GWTree](image.png)

# GWTree

**Git worktree manager for parallel development**

[![npm](https://img.shields.io/npm/v/gwtree?style=for-the-badge&logo=npm&logoColor=white&labelColor=000000&color=000000)](https://www.npmjs.com/package/gwtree)
[![Coverage](https://img.shields.io/badge/coverage-80.3%25-000000.svg?style=for-the-badge&labelColor=000000)](https://github.com/ahmadawais/gwtree)
[![Tests](https://img.shields.io/badge/tests-77_passing-000000.svg?style=for-the-badge&labelColor=000000)](https://github.com/ahmadawais/gwtree)
[![License](https://img.shields.io/badge/license-MIT-000000.svg?style=for-the-badge&labelColor=000000)](LICENSE)

<br />

Create and manage git worktrees effortlessly.
**Run multiple AI agents in parallel** — Claude Code, Command Code, Cursor on separate branches simultaneously.

<br />

</div>

---

<br />

## Installation

```bash
npm install -g gwtree
```

<br />

## Usage

### Multi-Agent Parallel Execution

```bash
gwt auth api dashboard -x    # Create 3 worktrees instantly, no editor popups
```

Spin up isolated worktrees for multiple AI agents to work in parallel:
- **[Claude Code](https://claude.ai/code)** → `repo-auth/` fixing authentication
- **[Command Code](https://commandcode.ai)** → `repo-api/` building API endpoints
- **Cursor** → `repo-dashboard/` creating UI components

Each agent works on its own branch without conflicts. Merge when ready with `gwt merge`.

<br />

### Create Worktree

```bash
gwt                    # Interactive mode
gwt feature-login      # Quick: creates repo-feature-login worktree with feature-login branch
gwt feature-login -y   # Fast: skip all prompts, use saved defaults
gwt auth api dashboard # Batch: create multiple worktrees at once
gwt a b c -x           # Batch + skip editor opens
```

Interactive prompts guide you through:
1. **Name** — Enter name for both worktree and branch (press ESC to set separately)
2. **Stash/Switch** — Handle uncommitted changes and switch to main
3. **Pull** — Fetch latest changes from remote

The CLI shows each command as it runs with full transparency.

<br />

### List & Remove Worktrees

```bash
gwt ls                 # List all worktrees for current repo
gwt rm                 # Interactive search and remove
```

<br />

### Status Dashboard

```bash
gwt status             # Show status of all worktrees
gwt st                 # Alias
```

Shows for each worktree: changes, commits ahead/behind, merge status.

<br />

### Clean Merged Worktrees

```bash
gwt clean              # Remove worktrees that have been merged to main
gwt clean --all        # Remove all worktrees
```

<br />

### Merge & Cleanup

```bash
gwt merge feature      # Merge branch to main, remove worktree, delete branch
```

Automates: checkout main, merge, remove worktree, delete branch.

<br />

---

<br />

## Features

**Batch creation**
Create multiple worktrees at once: `gwt dashboard api auth`

**Status dashboard**
See changes, commits ahead/behind, merge status for all worktrees

**Smart cleanup**
Auto-remove merged worktrees, or clean all with `--all`

**Merge helper**
One command to merge, remove worktree, and delete branch

**Quick worktree creation**
Minimal prompts, smart defaults, transparent command output

**Smart naming**
Pattern: `{repo}-{name}` with matching branch name

**Interactive management**
List, search, and delete worktrees

**Clean UX**
Compact output with └ brackets, ESC for separate worktree/branch names

<br />

---

<br />

## Configuration

Manage defaults with `gwt config` or `gwt config reset`.

Settings stored in `~/.config/gwtree/config.json`:
- **editor** — `code`, `cursor`, `default`, or `none`
- **installDeps** — Auto-install dependencies (true/false)
- **lastPm** — Last used package manager

<br />

---

<br />

## Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `gwt` | `gwtree` | Create new worktree (interactive) |
| `gwt [name]` | — | Create worktree + branch with name |
| `gwt a b c` | — | Batch create multiple worktrees |
| `gwt [name] -y` | — | Fast mode, skip all prompts |
| `gwt [name] -x` | `--no-editor` | Skip opening editor |
| `gwt ls` | `list` | List worktrees for current repo |
| `gwt rm` | `remove` | Interactive search and remove |
| `gwt status` | `st` | Show status of all worktrees |
| `gwt clean` | `c` | Remove merged worktrees |
| `gwt clean -a` | `--all` | Remove all worktrees |
| `gwt merge <name>` | `m` | Merge branch to main and cleanup |
| `gwt config` | — | Open config file |
| `gwt config reset` | — | Reset to defaults |
| `gwt -v` | `--version` | Show version |
| `gwt -h` | `--help` | Show help |

<br />

---

<br />

## Why GWTree?

**Built for the AI-assisted development era:**

- **Multi-agent parallelism** — Run Claude Code, Command Code, Cursor on separate features simultaneously
- **Instant worktree creation** — `gwt a b c -x` creates 3 isolated environments in seconds
- **Clean merges** — Each agent works on its own branch, merge when ready
- **Zero conflicts** — No stashing, no branch switching, no context loss

<br />

---

<br />


**MIT License** by [Ahmad Awais](https://x.com/MrAhmadAwais).
