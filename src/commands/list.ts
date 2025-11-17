import * as p from '@clack/prompts';
import {execSync} from 'child_process';
import chalk from 'chalk';
import {basename} from 'path';

export async function listWorktrees() {
	p.intro('Manage Worktrees');

	try {
		while (true) {
			const output = execSync('git worktree list --porcelain', {
				encoding: 'utf-8',
				stdio: ['pipe', 'pipe', 'pipe'],
			});

			const worktrees = [];
			const lines = output.trim().split('\n');
			let current: any = {};

			for (const line of lines) {
				if (line.startsWith('worktree ')) {
					if (current.path) worktrees.push(current);
					current = {path: line.replace('worktree ', '')};
				} else if (line.startsWith('branch ')) {
					current.branch = line
						.replace('branch ', '')
						.split('/')
						.pop();
				} else if (line.startsWith('HEAD ')) {
					current.head = line.replace('HEAD ', '').substring(0, 7);
				}
			}
			if (current.path) worktrees.push(current);

			const nonMainWorktrees = worktrees.slice(1);

			if (nonMainWorktrees.length === 0) {
				p.cancel('No worktrees found');
				process.exit(0);
			}

			const worktreeChoice = await p.select({
				message: 'Select worktree to delete (ESC to exit):',
				options: nonMainWorktrees.map(wt => ({
					value: wt.path,
					label: `${wt.branch || wt.head} ${chalk.dim(basename(wt.path))}`,
				})),
			});

			if (p.isCancel(worktreeChoice)) {
				p.outro('Done');
				process.exit(0);
			}

			const selectedName = basename(worktreeChoice as string);
			const confirm = await p.confirm({
				message: `Delete ${selectedName}?`,
				initialValue: false,
			});

			if (p.isCancel(confirm)) {
				p.outro('Done');
				process.exit(0);
			}

			if (confirm) {
				const s = p.spinner();
				s.start('Removing worktree...');

				try {
					execSync(`git worktree remove "${worktreeChoice}"`, {
						stdio: 'pipe',
					});
					s.stop(`${selectedName} removed!`);
				} catch (error) {
					s.stop('Failed to remove worktree');
					throw error;
				}
			}
		}
	} catch (error) {
		if (
			error instanceof Error &&
			error.message.includes('not a git repository')
		) {
			p.cancel('Error: Not in a git repository');
			process.exit(1);
		}
		throw error;
	}
}
