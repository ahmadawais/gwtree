import * as p from '@clack/prompts';
import { execSync } from 'child_process';
import { rmSync, existsSync } from 'fs';
import chalk from 'chalk';
import { basename } from 'path';
import { getAllWorktrees, removeWorktreeRecord } from '../config.js';
import { search } from '@inquirer/prompts';

// Step output with └ bracket for description
function logStep(name: string, desc: string, error = false) {
  const color = error ? chalk.red : chalk.green;
  console.log(`│`);
  console.log(`│  ${color('◆')}  ${color(name)}`);
  console.log(`│  ${chalk.dim('└')}  ${chalk.dim(desc)}`);
}

// Get worktree status info
function getWorktreeStatus(wtPath: string, repoRoot: string, mainBranch: string): {
  changes: number;
  additions: number;
  deletions: number;
  ahead: number;
  behind: number;
  isMerged: boolean;
} {
  try {
    // Get changed files count
    const status = execSync('git status --porcelain', {
      cwd: wtPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    const changes = status ? status.split('\n').length : 0;

    // Get diff stats
    let additions = 0;
    let deletions = 0;
    try {
      const diffStat = execSync(`git diff --stat HEAD`, {
        cwd: wtPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      const match = diffStat.match(/(\d+) insertion.*?(\d+) deletion/);
      if (match) {
        additions = parseInt(match[1]) || 0;
        deletions = parseInt(match[2]) || 0;
      }
    } catch {
      // ignore
    }

    // Get ahead/behind
    let ahead = 0;
    let behind = 0;
    try {
      const branch = execSync('git branch --show-current', {
        cwd: wtPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();

      const revList = execSync(`git rev-list --left-right --count ${mainBranch}...${branch}`, {
        cwd: wtPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      const [behindStr, aheadStr] = revList.split('\t');
      behind = parseInt(behindStr) || 0;
      ahead = parseInt(aheadStr) || 0;
    } catch {
      // ignore
    }

    // Check if merged
    let isMerged = false;
    try {
      const branch = execSync('git branch --show-current', {
        cwd: wtPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();

      const mergedBranches = execSync(`git branch --merged ${mainBranch}`, {
        cwd: repoRoot,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      isMerged = mergedBranches.split('\n').some(b => b.trim() === branch);
    } catch {
      // ignore
    }

    return { changes, additions, deletions, ahead, behind, isMerged };
  } catch {
    return { changes: 0, additions: 0, deletions: 0, ahead: 0, behind: 0, isMerged: false };
  }
}

export async function listWorktrees() {
  try {
    let gitRoot: string;
    try {
      gitRoot = execSync('git rev-parse --show-toplevel', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
    } catch {
      p.cancel('Not in a git repository');
      process.exit(1);
    }

    const repoName = basename(gitRoot);
    const allWorktrees = getAllWorktrees();
    const worktrees = allWorktrees.filter(wt =>
      existsSync(wt.path) && wt.repoName === repoName
    );

    if (worktrees.length === 0) {
      console.log(chalk.dim('No worktrees found for this repo'));
      process.exit(0);
    }

    p.intro(`Worktrees for ${chalk.cyan(repoName)}`);

    for (const wt of worktrees) {
      logStep(wt.branch, wt.path);
    }

    console.log(`│`);
    console.log(`└  ${chalk.dim(`${worktrees.length} worktree${worktrees.length > 1 ? 's' : ''}`)}`);
    console.log();
  } catch (error) {
    throw error;
  }
}

export async function rmWorktree() {
  p.intro('Remove Worktree');

  try {
    let gitRoot: string;
    try {
      gitRoot = execSync('git rev-parse --show-toplevel', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
    } catch {
      p.cancel('Not in a git repository');
      process.exit(1);
    }

    const repoName = basename(gitRoot);

    while (true) {
      const allWorktrees = getAllWorktrees();
      const worktrees = allWorktrees.filter(wt =>
        existsSync(wt.path) && wt.repoName === repoName
      );

      if (worktrees.length === 0) {
        console.log(`│`);
        console.log(`└  ${chalk.dim(`No worktrees found for ${repoName}`)}`);
        console.log();
        process.exit(0);
      }

      const choices = worktrees.map(wt => ({
        value: wt.path,
        name: `${wt.branch} ${chalk.dim(basename(wt.path))}`,
        description: wt.path
      }));

      let selectedPath: string;
      try {
        selectedPath = await search({
          message: 'Search worktree:',
          source: async (input) => {
            if (!input) return choices;
            const lower = input.toLowerCase();
            return choices.filter(c =>
              c.name.toLowerCase().includes(lower) ||
              c.value.toLowerCase().includes(lower)
            );
          }
        });
      } catch {
        console.log(`│`);
        console.log(`└  ${chalk.dim('Done')}`);
        console.log();
        process.exit(0);
      }

      const selectedName = basename(selectedPath);
      const record = worktrees.find(w => w.path === selectedPath);

      const confirm = await p.confirm({
        message: `Remove ${chalk.green(selectedName)}?`,
        initialValue: true
      });

      if (p.isCancel(confirm)) {
        console.log(`│`);
        console.log(`└  ${chalk.dim('Done')}`);
        console.log();
        process.exit(0);
      }

      if (confirm) {
        const rmCmd = `git worktree remove "${selectedPath}" --force`;
        try {
          if (record?.repoRoot && existsSync(record.repoRoot)) {
            try {
              execSync(rmCmd, {
                cwd: record.repoRoot,
                stdio: 'pipe'
              });
            } catch {
              if (existsSync(selectedPath)) {
                rmSync(selectedPath, { recursive: true, force: true });
              }
            }
          } else {
            if (existsSync(selectedPath)) {
              rmSync(selectedPath, { recursive: true, force: true });
            }
          }

          removeWorktreeRecord(selectedPath);

          logStep(`Removed ${selectedName}`, selectedPath);
        } catch (error) {
          logStep(`Failed to remove ${selectedName}`, selectedPath, true);
          throw error;
        }
      }
    }
  } catch (error) {
    throw error;
  }
}

// Status command - show all worktrees with their git status
export async function statusWorktrees() {
  try {
    let gitRoot: string;
    try {
      gitRoot = execSync('git rev-parse --show-toplevel', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
    } catch {
      p.cancel('Not in a git repository');
      process.exit(1);
    }

    const repoName = basename(gitRoot);
    const allWorktrees = getAllWorktrees();
    const worktrees = allWorktrees.filter(wt =>
      existsSync(wt.path) && wt.repoName === repoName
    );

    const mainBranch = (() => {
      try {
        const branches = execSync('git branch --format="%(refname:short)"', {
          encoding: 'utf-8',
          cwd: gitRoot
        }).trim().split('\n');
        return branches.find(b => b === 'main' || b === 'master') || 'main';
      } catch {
        return 'main';
      }
    })();

    if (worktrees.length === 0) {
      console.log(chalk.dim('No worktrees found for this repo'));
      process.exit(0);
    }

    p.intro(`Status for ${chalk.cyan(repoName)}`);

    let readyToMerge = 0;
    let inProgress = 0;
    let merged = 0;

    for (const wt of worktrees) {
      const status = getWorktreeStatus(wt.path, gitRoot, mainBranch);

      let statusText = '';
      let statusColor = chalk.green;

      if (status.isMerged) {
        statusText = '✓ merged';
        statusColor = chalk.gray;
        merged++;
      } else if (status.changes === 0 && status.ahead > 0) {
        statusText = `ready to merge (${status.ahead} commit${status.ahead > 1 ? 's' : ''} ahead)`;
        statusColor = chalk.green;
        readyToMerge++;
      } else {
        const parts = [];
        if (status.changes > 0) parts.push(`${status.changes} changed`);
        if (status.ahead > 0) parts.push(`${status.ahead} ahead`);
        if (status.behind > 0) parts.push(`${status.behind} behind`);
        statusText = parts.length > 0 ? parts.join(', ') : 'no changes';
        statusColor = status.changes > 0 ? chalk.yellow : chalk.dim;
        inProgress++;
      }

      const diffText = status.additions > 0 || status.deletions > 0
        ? `  ${chalk.green(`+${status.additions}`)} ${chalk.red(`-${status.deletions}`)}`
        : '';

      console.log(`│`);
      console.log(`│  ${statusColor('◆')}  ${statusColor(wt.branch)}${diffText}`);
      console.log(`│  ${chalk.dim('└')}  ${statusColor(statusText)}`);
    }

    console.log(`│`);
    const summary = [];
    if (readyToMerge > 0) summary.push(chalk.green(`${readyToMerge} ready to merge`));
    if (inProgress > 0) summary.push(chalk.yellow(`${inProgress} in progress`));
    if (merged > 0) summary.push(chalk.dim(`${merged} merged`));
    console.log(`└  ${summary.join(', ') || chalk.dim('no worktrees')}`);
    console.log();
  } catch (error) {
    throw error;
  }
}

// Clean command - remove merged worktrees
export async function cleanWorktrees(options?: { all?: boolean }) {
  const removeAll = options?.all ?? false;

  try {
    let gitRoot: string;
    try {
      gitRoot = execSync('git rev-parse --show-toplevel', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
    } catch {
      p.cancel('Not in a git repository');
      process.exit(1);
    }

    const repoName = basename(gitRoot);
    const allWorktrees = getAllWorktrees();
    const worktrees = allWorktrees.filter(wt =>
      existsSync(wt.path) && wt.repoName === repoName
    );

    const mainBranch = (() => {
      try {
        const branches = execSync('git branch --format="%(refname:short)"', {
          encoding: 'utf-8',
          cwd: gitRoot
        }).trim().split('\n');
        return branches.find(b => b === 'main' || b === 'master') || 'main';
      } catch {
        return 'main';
      }
    })();

    if (worktrees.length === 0) {
      console.log(chalk.dim('No worktrees found for this repo'));
      process.exit(0);
    }

    p.intro(removeAll ? 'Clean All Worktrees' : 'Clean Merged Worktrees');

    // Find worktrees to remove
    const toRemove = removeAll
      ? worktrees
      : worktrees.filter(wt => {
          const status = getWorktreeStatus(wt.path, gitRoot, mainBranch);
          return status.isMerged;
        });

    if (toRemove.length === 0) {
      console.log(`│`);
      console.log(`└  ${chalk.dim('No worktrees to clean')}`);
      console.log();
      process.exit(0);
    }

    // Show what will be removed
    console.log(`│`);
    console.log(`│  ${chalk.yellow('Will remove:')}`);
    for (const wt of toRemove) {
      console.log(`│  ${chalk.dim('•')}  ${wt.branch} ${chalk.dim(basename(wt.path))}`);
    }

    const confirm = await p.confirm({
      message: `Remove ${toRemove.length} worktree${toRemove.length > 1 ? 's' : ''}?`,
      initialValue: true
    });

    if (p.isCancel(confirm) || !confirm) {
      console.log(`│`);
      console.log(`└  ${chalk.dim('Cancelled')}`);
      console.log();
      process.exit(0);
    }

    let removed = 0;
    for (const wt of toRemove) {
      const selectedName = basename(wt.path);
      try {
        if (wt.repoRoot && existsSync(wt.repoRoot)) {
          try {
            execSync(`git worktree remove "${wt.path}" --force`, {
              cwd: wt.repoRoot,
              stdio: 'pipe'
            });
          } catch {
            if (existsSync(wt.path)) {
              rmSync(wt.path, { recursive: true, force: true });
            }
          }
        } else {
          if (existsSync(wt.path)) {
            rmSync(wt.path, { recursive: true, force: true });
          }
        }
        removeWorktreeRecord(wt.path);
        removed++;

        console.log(`│`);
        console.log(`│  ${chalk.green('◆')}  ${chalk.green(`Removed ${selectedName}`)}`);
        console.log(`│  ${chalk.dim('└')}  ${chalk.dim(wt.path)}`);
      } catch (error) {
        console.log(`│`);
        console.log(`│  ${chalk.red('◆')}  ${chalk.red(`Failed ${selectedName}`)}`);
      }
    }

    console.log(`│`);
    console.log(`└  ${chalk.green('Done')}  Removed ${removed} worktree${removed > 1 ? 's' : ''}`);
    console.log();
  } catch (error) {
    throw error;
  }
}

// Merge command - merge worktree branch to main and remove
export async function mergeWorktree(name: string) {
  try {
    let gitRoot: string;
    try {
      gitRoot = execSync('git rev-parse --show-toplevel', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
    } catch {
      p.cancel('Not in a git repository');
      process.exit(1);
    }

    const repoName = basename(gitRoot);
    const allWorktrees = getAllWorktrees();
    const worktrees = allWorktrees.filter(wt =>
      existsSync(wt.path) && wt.repoName === repoName
    );

    // Find worktree by branch name or worktree name
    const wt = worktrees.find(w =>
      w.branch === name ||
      basename(w.path) === name ||
      basename(w.path) === `${repoName}-${name}`
    );

    if (!wt) {
      p.cancel(`Worktree not found: ${name}`);
      process.exit(1);
    }

    const mainBranch = (() => {
      try {
        const branches = execSync('git branch --format="%(refname:short)"', {
          encoding: 'utf-8',
          cwd: gitRoot
        }).trim().split('\n');
        return branches.find(b => b === 'main' || b === 'master') || 'main';
      } catch {
        return 'main';
      }
    })();

    p.intro(`Merge ${chalk.green(wt.branch)} to ${chalk.yellow(mainBranch)}`);

    // Check for uncommitted changes
    const status = getWorktreeStatus(wt.path, gitRoot, mainBranch);
    if (status.changes > 0) {
      p.cancel(`Worktree has uncommitted changes. Commit or stash them first.`);
      process.exit(1);
    }

    // Switch to main
    try {
      execSync(`git checkout ${mainBranch}`, { cwd: gitRoot, stdio: 'pipe' });
      logStep('Switch', `git checkout ${mainBranch}`, 'switched to main');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logStep('Switch', `git checkout ${mainBranch}`, errMsg.split('\n').pop() || 'failed', true);
      process.exit(1);
    }

    // Merge
    try {
      execSync(`git merge ${wt.branch}`, { cwd: gitRoot, stdio: 'pipe' });
      logStep('Merge', `git merge ${wt.branch}`, 'merged to main');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logStep('Merge', `git merge ${wt.branch}`, errMsg.split('\n').pop() || 'failed', true);
      p.cancel('Merge failed. Resolve conflicts manually.');
      process.exit(1);
    }

    // Remove worktree
    const selectedName = basename(wt.path);
    try {
      execSync(`git worktree remove "${wt.path}" --force`, {
        cwd: gitRoot,
        stdio: 'pipe'
      });
    } catch {
      if (existsSync(wt.path)) {
        rmSync(wt.path, { recursive: true, force: true });
      }
    }
    removeWorktreeRecord(wt.path);
    logStep('Remove', `git worktree remove .../${selectedName}`, 'worktree removed');

    // Delete branch
    try {
      execSync(`git branch -d ${wt.branch}`, { cwd: gitRoot, stdio: 'pipe' });
      logStep('Branch', `git branch -d ${wt.branch}`, 'branch deleted');
    } catch {
      // Branch might already be deleted
    }

    console.log(`│`);
    console.log(`└  ${chalk.green('Done')}  Merged and cleaned up ${wt.branch}`);
    console.log();
  } catch (error) {
    throw error;
  }
}
