import * as p from '@clack/prompts';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { getConfig } from '../config.js';
import chalk from 'chalk';

export async function createWorktree() {
  const userConfig = getConfig();
  p.intro('Create Git Worktree');

  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    const repoName = basename(gitRoot);
    const parentDir = dirname(gitRoot);

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

    const mainBranch = branches.find(b => b === 'main' || b === 'master') || currentBranch;

    const branchChoice = await p.select({
      message: 'Branch:',
      options: [
        { value: mainBranch, label: mainBranch },
        { value: 'new', label: 'Create new branch' }
      ],
      initialValue: userConfig.defaultBranchChoice === 'new' ? 'new' : mainBranch
    });

    if (p.isCancel(branchChoice)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    let branchName: string;
    let baseBranch: string;

    if (branchChoice === 'new') {
      const newBranchName = await p.text({
        message: 'New branch name:',
        placeholder: `${currentBranch}-worktree`,
        validate: (value) => {
          if (!value) return 'Branch name is required';
          if (branches.includes(value)) return 'Branch already exists';
        }
      });

      if (p.isCancel(newBranchName)) {
        p.cancel('Operation cancelled');
        process.exit(0);
      }

      branchName = newBranchName as string;
      baseBranch = currentBranch;
    } else {
      branchName = branchChoice as string;
      baseBranch = branchChoice as string;
    }

    const prefix = userConfig.namePattern
      .replace('{repo}', repoName)
      .replace('{branch}', branchName)
      .replace('-{suffix}', '');

    const suffix = await p.text({
      message: `Worktree name: ${chalk.dim(prefix + '-')}`,
      defaultValue: userConfig.defaultSuffix,
      placeholder: `${userConfig.defaultSuffix} (ESC for full edit)`
    });

    let worktreeName: string;

    if (p.isCancel(suffix)) {
      const defaultName = `${repoName}-${branchName}`;

      const customName = await p.text({
        message: 'Custom name:',
        defaultValue: defaultName,
        placeholder: defaultName
      });

      if (p.isCancel(customName)) {
        p.cancel('Operation cancelled');
        process.exit(0);
      }

      worktreeName = customName as string;
    } else {
      worktreeName = `${prefix}-${suffix}`;
    }

    const worktreePath = join(parentDir, worktreeName);

    if (existsSync(worktreePath)) {
      p.cancel(`Directory ${worktreeName} already exists`);
      process.exit(1);
    }

    if (p.isCancel(worktreeName)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    const s = p.spinner();
    s.start('Creating worktree...');

    try {
      if (branchChoice === 'new') {
        execSync(`git worktree add -b "${branchName}" "${worktreePath}" "${baseBranch}"`, {
          cwd: gitRoot,
          stdio: 'pipe'
        });
      } else {
        let newBranchForWorktree = `${branchName}-${String(suffix) || 'wt'}`;
        let counter = 1;
        while (branches.includes(newBranchForWorktree)) {
          newBranchForWorktree = `${branchName}-${String(suffix) || 'wt'}-${counter}`;
          counter++;
        }
        execSync(`git worktree add -b "${newBranchForWorktree}" "${worktreePath}" "${baseBranch}"`, {
          cwd: gitRoot,
          stdio: 'pipe'
        });
      }
      s.stop('Worktree created successfully!');
    } catch (error) {
      s.stop('Failed to create worktree');
      throw error;
    }

    const editorChoice = await p.select({
      message: 'Open in:',
      options: [
        { value: 'code', label: 'VS Code' },
        { value: 'default', label: 'Default ($EDITOR)' },
        { value: 'none', label: 'Don\'t open' }
      ],
      initialValue: userConfig.defaultEditor
    });

    if (p.isCancel(editorChoice)) {
      p.outro(`Worktree created at: ${worktreePath}`);
      process.exit(0);
    }

    if (editorChoice !== 'none') {
      const s2 = p.spinner();
      s2.start('Opening editor...');

      try {
        if (editorChoice === 'code') {
          execSync(`code "${worktreePath}"`, { stdio: 'ignore' });
        } else {
          const editor = process.env.EDITOR || 'vim';
          execSync(`${editor} "${worktreePath}"`, { stdio: 'inherit' });
        }
        s2.stop('Editor opened!');
      } catch (error) {
        s2.stop('Failed to open editor');
        console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    p.outro(`✓ Worktree ready at: ${worktreePath}\n  Branch: ${branchName}`);

  } catch (error) {
    if (error instanceof Error && error.message.includes('not a git repository')) {
      p.cancel('Error: Not in a git repository');
      process.exit(1);
    }
    throw error;
  }
}
