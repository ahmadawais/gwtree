import * as p from '@clack/prompts';
import { execSync } from 'child_process';
import chalk from 'chalk';

export async function removeWorktree() {
  p.intro('Remove Git Worktree');

  try {
    const output = execSync('git worktree list --porcelain', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const worktrees = [];
    const lines = output.trim().split('\n');
    let current: any = {};

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        if (current.path) worktrees.push(current);
        current = { path: line.replace('worktree ', '') };
      } else if (line.startsWith('branch ')) {
        current.branch = line.replace('branch ', '').split('/').pop();
      } else if (line.startsWith('HEAD ')) {
        current.head = line.replace('HEAD ', '').substring(0, 7);
      }
    }
    if (current.path) worktrees.push(current);

    const nonMainWorktrees = worktrees.slice(1);

    if (nonMainWorktrees.length === 0) {
      p.cancel('No worktrees to remove');
      process.exit(0);
    }

    const worktreeChoice = await p.select({
      message: 'Select worktree to remove:',
      options: nonMainWorktrees.map(wt => ({
        value: wt.path,
        label: `${wt.branch || wt.head} - ${wt.path}`
      }))
    });

    if (p.isCancel(worktreeChoice)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    const confirm = await p.confirm({
      message: `Remove worktree at ${worktreeChoice}?`,
      initialValue: false
    });

    if (p.isCancel(confirm) || !confirm) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    const s = p.spinner();
    s.start('Removing worktree...');

    try {
      execSync(`git worktree remove "${worktreeChoice}"`, {
        stdio: 'pipe'
      });
      s.stop('Worktree removed successfully!');
    } catch (error) {
      s.stop('Failed to remove worktree');
      throw error;
    }

    p.outro('✓ Done');
  } catch (error) {
    if (error instanceof Error && error.message.includes('not a git repository')) {
      p.cancel('Error: Not in a git repository');
      process.exit(1);
    }
    throw error;
  }
}
