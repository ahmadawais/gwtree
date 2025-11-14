import * as p from '@clack/prompts';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname, basename } from 'path';

export async function createWorktree() {
  p.intro('Create Git Worktree');

  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    const repoName = basename(gitRoot);
    const parentDir = dirname(gitRoot);

    const branches = execSync('git branch --format="%(refname:short)"', {
      encoding: 'utf-8',
      cwd: gitRoot
    })
      .trim()
      .split('\n')
      .filter(Boolean);

    const worktreeName = await p.text({
      message: 'What should the worktree be named?',
      placeholder: `${repoName}-worktree`,
      defaultValue: `${repoName}-worktree`,
      validate: (value) => {
        if (!value) return 'Worktree name is required';
        const worktreePath = join(parentDir, value);
        if (existsSync(worktreePath)) {
          return `Directory ${value} already exists`;
        }
      }
    });

    if (p.isCancel(worktreeName)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    const branch = await p.select({
      message: 'Which branch should the worktree use?',
      options: branches.map(b => ({ value: b, label: b })),
      initialValue: branches.find(b => b === 'main' || b === 'master') || branches[0]
    });

    if (p.isCancel(branch)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    const worktreePath = join(parentDir, worktreeName as string);

    const s = p.spinner();
    s.start('Creating worktree...');

    try {
      execSync(`git worktree add "${worktreePath}" "${branch}"`, {
        cwd: gitRoot,
        stdio: 'pipe'
      });
      s.stop('Worktree created successfully!');
    } catch (error) {
      s.stop('Failed to create worktree');
      throw error;
    }

    const openEditor = await p.confirm({
      message: 'Would you like to open the worktree in an editor?',
      initialValue: true
    });

    if (p.isCancel(openEditor)) {
      p.outro(`Worktree created at: ${worktreePath}`);
      process.exit(0);
    }

    if (openEditor) {
      const editorChoice = await p.select({
        message: 'Which editor would you like to use?',
        options: [
          { value: 'code', label: 'VS Code' },
          { value: 'default', label: 'Default Editor ($EDITOR)' }
        ]
      });

      if (p.isCancel(editorChoice)) {
        p.outro(`Worktree created at: ${worktreePath}`);
        process.exit(0);
      }

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

    p.outro(`✓ Worktree ready at: ${worktreePath}\n  Branch: ${branch}`);

  } catch (error) {
    if (error instanceof Error && error.message.includes('not a git repository')) {
      p.cancel('Error: Not in a git repository');
      process.exit(1);
    }
    throw error;
  }
}
