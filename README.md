<div align="center">

# GWTree

**Git worktree manager for parallel development**

[![npm](https://img.shields.io/npm/v/gwtree?style=for-the-badge&logo=npm&logoColor=white&labelColor=000000&color=000000)](https://www.npmjs.com/package/gwtree)
[![Coverage](https://img.shields.io/badge/coverage-88.7%25-000000.svg?style=for-the-badge&labelColor=000000)](https://github.com/ahmadawais/gwtree)
[![Tests](https://img.shields.io/badge/tests-34_passing-000000.svg?style=for-the-badge&labelColor=000000)](https://github.com/ahmadawais/gwtree)
[![License](https://img.shields.io/badge/license-MIT-000000.svg?style=for-the-badge&labelColor=000000)](LICENSE)

<br />

Create and manage git worktrees effortlessly.  
Perfect for running multiple coding agents in parallel on different branches.

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

### Create Worktree

```bash
gwtree
```

Interactive prompts guide you through:
1. **Branch** — Select main/master or create new branch
2. **Worktree name** — Quick edit suffix or press ESC for full customization
3. **Open in** — Choose VS Code, default editor, or skip

<br />

### List & Delete Worktrees

```bash
gwtree list
```

Browse and delete worktrees interactively with arrow keys and search.

<br />

### Remove Worktree

```bash
gwtree remove
```

<br />

---

<br />

## Features

**Quick worktree creation**  
Minimal prompts, smart defaults

**Smart naming**  
Pattern: `{repo}-{branch}-wt-{suffix}`

**Interactive management**  
List, search, and delete worktrees

**Configurable defaults**  
Customize via `~/.config/gwtree/config.json`

**Clean UX**  
Dimmed prefixes, ESC for full control

**Auto branch creation**  
Unique branch names for each worktree

<br />

---

<br />

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

<br />

---

<br />

## Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `gwtree` | `gwt` | Create new worktree |
| `gwtree list` | `gwt ls` | List and manage worktrees |
| `gwtree remove` | `gwt rm` | Remove a worktree |
| `gwtree -v` | `--version` | Show version |
| `gwtree -h` | `--help` | Show help |

<br />

---

<br />

## Why GWTree?

Perfect for parallel development workflows:

- Run Command Code, Claude and Codex simultaneously on different features
- Test changes across multiple branches
- Keep main branch clean while experimenting
- Quick context switching without stashing

<br />

---

<br />

<div align="center">

**MIT License** © 2025 [Ahmad Awais](https://x.com/_AhmadAwais)

</div>
