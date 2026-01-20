import * as p from '@clack/prompts';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname, basename, relative } from 'path';
import chalk from 'chalk';
import { addWorktreeRecord, getConfig, setConfig } from '../config.js';

// Step output with └ bracket for description
function logStep(name: string, cmd: string, desc: string, error = false) {
  const color = error ? chalk.red : chalk.green;
  console.log(`│`);
  console.log(`│  ${color('◆')}  ${color(name)}  ${chalk.dim(cmd)}`);
  console.log(`│  ${chalk.dim('└')}  ${chalk.dim(desc)}`);
}

function detectPackageManager(dir: string): 'pnpm' | 'npm' | 'yarn' | 'bun' | null {
  if (existsSync(join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(dir, 'bun.lockb'))) return 'bun';
  if (existsSync(join(dir, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(dir, 'package-lock.json'))) return 'npm';
  if (existsSync(join(dir, 'package.json'))) return 'pnpm';
  return null;
}

function getInstallCommand(pm: string): string {
  switch (pm) {
    case 'pnpm': return 'pnpm install';
    case 'yarn': return 'yarn install';
    case 'bun': return 'bun install';
    default: return 'npm install';
  }
}

export async function createWorktree(branchArg?: string, options?: { yes?: boolean; noEditor?: boolean }) {
  const useDefaults = options?.yes ?? false;
  const noEditor = options?.noEditor ?? false;
  const savedConfig = getConfig();

  p.intro('Create Git Worktree');

  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    const repoName = basename(gitRoot);
    const parentDir = dirname(gitRoot);
    const cwd = process.cwd();

    const currentBranch = execSync('git branch --show-current', {
      encoding: 'utf-8',
      cwd: gitRoot
    }).trim();

    const branches = execSync('git branch --format="%(refname:short)"', {
      encoding: 'utf-8',
      cwd: gitRoot
    })
      .trim()
      .split('\n')
      .filter(Boolean);

    const mainBranch = branches.find(b => b === 'main' || b === 'master') || 'main';

    const statusOutput = execSync('git status --porcelain', {
      encoding: 'utf-8',
      cwd: gitRoot
    }).trim();

    const hasChanges = statusOutput.length > 0;
    const isOnMain = currentBranch === mainBranch;

    if (hasChanges) {
      let action: string | symbol = 'stash';
      if (!useDefaults) {
        action = await p.select({
          message: `Uncommitted changes detected:`,
          initialValue: 'stash',
          options: [
            { value: 'stash', label: 'Stash changes' },
            { value: 'ignore', label: 'Ignore and continue' },
            { value: 'cancel', label: 'Cancel' }
          ]
        });

        if (p.isCancel(action) || action === 'cancel') {
          p.cancel('Operation cancelled');
          process.exit(0);
        }
      }

      if (action === 'stash') {
        execSync('git stash', { cwd: gitRoot, stdio: 'pipe' });
        logStep('Stash', 'git stash', 'saves uncommitted changes');
      }
    }

    if (!isOnMain) {
      let action: string | symbol = 'switch';
      if (!useDefaults) {
        action = await p.select({
          message: `Not on ${mainBranch} (currently on ${currentBranch}):`,
          initialValue: 'switch',
          options: [
            { value: 'switch', label: `Switch to ${mainBranch}` },
            { value: 'ignore', label: 'Ignore and continue' },
            { value: 'cancel', label: 'Cancel' }
          ]
        });

        if (p.isCancel(action) || action === 'cancel') {
          p.cancel('Operation cancelled');
          process.exit(0);
        }
      }

      if (action === 'switch') {
        execSync(`git checkout ${mainBranch}`, { cwd: gitRoot, stdio: 'pipe' });
        logStep('Switch', `git checkout ${mainBranch}`, 'switches to base branch');
      }
    }

    let hasRemote = false;
    try {
      const remotes = execSync('git remote', { cwd: gitRoot, encoding: 'utf-8' }).trim();
      hasRemote = remotes.length > 0;
    } catch {
      hasRemote = false;
    }

    if (hasRemote) {
      let pullAction: string | symbol = 'pull';
      if (!useDefaults) {
        pullAction = await p.select({
          message: `Pull latest from origin/${mainBranch}?`,
          initialValue: 'pull',
          options: [
            { value: 'pull', label: 'Yes, git pull --rebase' },
            { value: 'ignore', label: 'Skip' }
          ]
        });

        if (p.isCancel(pullAction)) {
          p.cancel('Operation cancelled');
          process.exit(0);
        }
      }

      if (pullAction === 'pull') {
        const pullCmd = `git pull --rebase origin ${mainBranch}`;
        try {
          execSync(pullCmd, { cwd: gitRoot, stdio: 'pipe' });
          logStep('Pull', pullCmd, 'fetches latest changes');
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          logStep('Pull', pullCmd, errMsg.split('\n').pop() || 'failed', true);
        }
      }
    }

    let branchName: string;
    let worktreeSuffix: string;

    if (branchArg) {
      branchName = branchArg;
      worktreeSuffix = branchArg;
    } else {
      p.log.info(`${chalk.dim(parentDir + '/')}${repoName}-${chalk.green('<name>')}`);
      p.log.message(chalk.dim('Press ESC to set worktree and branch names separately'));

      const nameInput = await p.text({
        message: 'Worktree & branch name:',
        placeholder: 'feature-name',
        validate: (value) => {
          if (!value) return 'Name is required';
          if (!/^[a-zA-Z0-9._/-]+$/.test(value)) return 'Invalid name';
        }
      });

      if (p.isCancel(nameInput)) {
        // ESC pressed - ask for worktree and branch names separately
        console.log();
        p.log.info(`${chalk.dim(parentDir + '/')}${repoName}-${chalk.green('<worktree>')}`);

        const worktreeInput = await p.text({
          message: 'Worktree name:',
          placeholder: 'feature-name',
          validate: (value) => {
            if (!value) return 'Worktree name is required';
            if (!/^[a-zA-Z0-9._/-]+$/.test(value)) return 'Invalid worktree name';
          }
        });

        if (p.isCancel(worktreeInput)) {
          p.cancel('Operation cancelled');
          process.exit(0);
        }

        worktreeSuffix = worktreeInput as string;

        const branchInput = await p.text({
          message: 'Branch name:',
          placeholder: worktreeSuffix,
          defaultValue: worktreeSuffix,
          validate: (value) => {
            if (!value) return 'Branch name is required';
            if (!/^[a-zA-Z0-9._/-]+$/.test(value)) return 'Invalid branch name';
          }
        });

        if (p.isCancel(branchInput)) {
          p.cancel('Operation cancelled');
          process.exit(0);
        }

        branchName = branchInput as string;
      } else {
        branchName = nameInput as string;
        worktreeSuffix = nameInput as string;
      }
    }

    const worktreeName = `${repoName}-${worktreeSuffix}`;
    const worktreePath = join(parentDir, worktreeName);

    if (existsSync(worktreePath)) {
      p.cancel(`Directory already exists: ${worktreePath}`);
      process.exit(1);
    }

    let newBranchForWorktree = branchName;
    let counter = 1;
    while (branches.includes(newBranchForWorktree)) {
      newBranchForWorktree = `${branchName}-${counter}`;
      counter++;
    }

    p.log.info(`Creating ${chalk.green(worktreeName)} branch ${chalk.green(newBranchForWorktree)} from ${chalk.yellow(mainBranch)}`);

    // Prune
    try {
      execSync('git worktree prune', { cwd: gitRoot, stdio: 'pipe' });
    } catch {
      // ignore prune errors
    }
    logStep('Prune', 'git worktree prune', 'removes stale refs');

    // Create
    const addCmd = `git worktree add -b "${newBranchForWorktree}" "${worktreePath}" "${mainBranch}"`;
    const addCmdShort = `git worktree add -b "${newBranchForWorktree}" .../${worktreeName} "${mainBranch}"`;

    try {
      execSync(addCmd, { cwd: gitRoot, stdio: 'pipe' });
      logStep('Create', addCmdShort, worktreePath);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('already registered')) {
        logStep('Create', addCmdShort, 'worktree registered but missing', true);
      }
      p.cancel(errMsg.split('\n').pop() || 'Unknown error');
      process.exit(1);
    }

    addWorktreeRecord({
      path: worktreePath,
      branch: branchName,
      repoRoot: gitRoot,
      repoName,
      createdAt: new Date().toISOString()
    });

    // Handle deps install - use saved preference, no prompt
    // Prioritize detected PM in repo, fall back to saved lastPm
    const detectedPm = detectPackageManager(worktreePath);
    const pm = detectedPm || savedConfig.lastPm;

    if (pm && savedConfig.installDeps) {
      const installCmd = getInstallCommand(pm);
      try {
        execSync(installCmd, { cwd: worktreePath, stdio: 'pipe' });
        logStep('Install', installCmd, 'installs dependencies');
        setConfig('lastPm', pm);
      } catch (error) {
        logStep('Install', installCmd, 'failed to install', true);
      }
    }

    // Handle editor - use saved preference, no prompt
    const editorChoice = savedConfig.editor;

    if (editorChoice !== 'none' && !noEditor) {
      const editorCmd = editorChoice === 'default' ? (process.env.EDITOR || 'vim') : editorChoice;
      const openCmdShort = `${editorCmd} .../${worktreeName}`;
      try {
        if (editorChoice === 'code') {
          execSync(`code "${worktreePath}"`, { stdio: 'ignore' });
        } else if (editorChoice === 'cursor') {
          execSync(`cursor "${worktreePath}"`, { stdio: 'ignore' });
        } else if (editorChoice === 'default') {
          execSync(`${editorCmd} "${worktreePath}"`, { stdio: 'inherit' });
        }
        logStep('Open', openCmdShort, 'opens in editor');
      } catch {
        logStep('Open', openCmdShort, 'failed to open', true);
      }
    }

    // Calculate relative path for cd command
    const relativePath = relative(cwd, worktreePath);

    console.log(`│`);
    console.log(`└  ${chalk.green('Done')}  cd ${relativePath}`);
    console.log();

  } catch (error) {
    if (error instanceof Error && error.message.includes('not a git repository')) {
      p.cancel('Not in a git repository');
      process.exit(1);
    }
    throw error;
  }
}

// Batch creation for multiple worktrees
export async function createWorktreeBatch(names: string[], options?: { yes?: boolean; noEditor?: boolean }) {
  const savedConfig = getConfig();
  const noEditor = options?.noEditor ?? false;

  p.intro(`Create ${names.length} Git Worktrees`);

  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    const repoName = basename(gitRoot);
    const parentDir = dirname(gitRoot);
    const cwd = process.cwd();

    const branches = execSync('git branch --format="%(refname:short)"', {
      encoding: 'utf-8',
      cwd: gitRoot
    })
      .trim()
      .split('\n')
      .filter(Boolean);

    const mainBranch = branches.find(b => b === 'main' || b === 'master') || 'main';

    // Prune once at the start
    try {
      execSync('git worktree prune', { cwd: gitRoot, stdio: 'pipe' });
    } catch {
      // ignore
    }
    logStep('Prune', 'git worktree prune', 'removes stale refs');

    const created: string[] = [];
    const failed: string[] = [];

    for (const name of names) {
      const worktreeName = `${repoName}-${name}`;
      const worktreePath = join(parentDir, worktreeName);

      if (existsSync(worktreePath)) {
        console.log(`│`);
        console.log(`│  ${chalk.yellow('◆')}  ${chalk.yellow('Skip')}  ${worktreeName}`);
        console.log(`│  ${chalk.dim('└')}  ${chalk.dim('already exists')}`);
        failed.push(name);
        continue;
      }

      let branchName = name;
      let counter = 1;
      while (branches.includes(branchName)) {
        branchName = `${name}-${counter}`;
        counter++;
      }
      branches.push(branchName); // Track for next iteration

      const addCmd = `git worktree add -b "${branchName}" "${worktreePath}" "${mainBranch}"`;
      const addCmdShort = `git worktree add -b "${branchName}" .../${worktreeName}`;

      try {
        execSync(addCmd, { cwd: gitRoot, stdio: 'pipe' });
        logStep('Create', addCmdShort, worktreePath);

        addWorktreeRecord({
          path: worktreePath,
          branch: branchName,
          repoRoot: gitRoot,
          repoName,
          createdAt: new Date().toISOString()
        });

        // Install deps if configured
        const detectedPm = detectPackageManager(worktreePath);
        const pm = detectedPm || savedConfig.lastPm;
        if (pm && savedConfig.installDeps) {
          const installCmd = getInstallCommand(pm);
          try {
            execSync(installCmd, { cwd: worktreePath, stdio: 'pipe' });
            logStep('Install', `${installCmd} (${worktreeName})`, 'dependencies installed');
            setConfig('lastPm', pm);
          } catch {
            // ignore install errors in batch
          }
        }

        // Open in editor if configured
        if (savedConfig.editor && savedConfig.editor !== 'none' && !noEditor) {
          const editorCmd = savedConfig.editor === 'default' ? (process.env.EDITOR || 'vim') : savedConfig.editor;
          try {
            if (savedConfig.editor === 'code') {
              execSync(`code "${worktreePath}"`, { stdio: 'ignore' });
            } else if (savedConfig.editor === 'cursor') {
              execSync(`cursor "${worktreePath}"`, { stdio: 'ignore' });
            }
          } catch {
            // ignore editor errors in batch
          }
        }

        created.push(name);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.log(`│`);
        console.log(`│  ${chalk.red('◆')}  ${chalk.red('Failed')}  ${worktreeName}`);
        console.log(`│  ${chalk.dim('└')}  ${chalk.red(errMsg.split('\n').pop())}`);
        failed.push(name);
      }
    }

    console.log(`│`);
    if (created.length > 0) {
      console.log(`└  ${chalk.green('Done')}  Created ${created.length} worktree${created.length > 1 ? 's' : ''}`);
      console.log();
      console.log(chalk.dim('   cd commands:'));
      for (const name of created) {
        const worktreePath = join(parentDir, `${repoName}-${name}`);
        const relativePath = relative(cwd, worktreePath);
        console.log(chalk.dim(`   cd ${relativePath}`));
      }
    } else {
      console.log(`└  ${chalk.yellow('Done')}  No worktrees created`);
    }
    console.log();

  } catch (error) {
    if (error instanceof Error && error.message.includes('not a git repository')) {
      p.cancel('Not in a git repository');
      process.exit(1);
    }
    throw error;
  }
}
