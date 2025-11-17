import * as p from '@clack/prompts';
import {exec} from 'child_process';
import {promisify} from 'util';
import {existsSync} from 'fs';
import {join, dirname, basename} from 'path';
import {getConfig} from '../config.js';
import chalk from 'chalk';

const execAsync = promisify(exec);

export async function createWorktree() {
	const userConfig = getConfig();
	p.intro('Create Git Worktree');

	try {
		const {stdout: gitRootRaw} = await execAsync(
			'git rev-parse --show-toplevel',
			{
				encoding: 'utf-8',
			},
		);
		const gitRoot = gitRootRaw.trim();

		const repoName = basename(gitRoot);
		const parentDir = dirname(gitRoot);

		const {stdout: currentBranchRaw} = await execAsync(
			'git branch --show-current',
			{
				encoding: 'utf-8',
				cwd: gitRoot,
			},
		);
		const currentBranch = currentBranchRaw.trim();

		let hasRemote = false;
		let remoteName = 'origin';

		try {
			const {stdout: remoteCheckRaw} = await execAsync('git remote', {
				encoding: 'utf-8',
				cwd: gitRoot,
			});
			const remoteCheck = remoteCheckRaw.trim();

			if (remoteCheck.length > 0) {
				hasRemote = true;
				const remotes = remoteCheck.split('\n').filter(Boolean);
				remoteName = remotes.includes('origin') ? 'origin' : remotes[0];
			}
		} catch (error) {
			hasRemote = false;
		}

		if (hasRemote && userConfig.showRemoteBranches) {
			const shouldFetch = await p.confirm({
				message: `Fetch latest from "${remoteName}"?`,
				initialValue: true,
			});

			if (!p.isCancel(shouldFetch) && shouldFetch) {
				const fetchSpinner = p.spinner();
				fetchSpinner.start(`Fetching from ${remoteName}...`);

				try {
					await execAsync(`git fetch ${remoteName}`, {
						cwd: gitRoot,
					});

					fetchSpinner.stop(`Fetched from ${remoteName}`);
				} catch (error) {
					fetchSpinner.stop(`Failed to fetch from ${remoteName}`);
				}
			}
		}

		const {stdout: branchesRaw} = await execAsync(
			'git branch --format="%(refname:short)"',
			{
				encoding: 'utf-8',
				cwd: gitRoot,
			},
		);
		const branches = branchesRaw.trim().split('\n').filter(Boolean);

		let remoteBranches: string[] = [];

		if (hasRemote && userConfig.showRemoteBranches) {
			try {
				const {stdout: remoteBranchListRaw} = await execAsync(
					'git branch -r --format="%(refname:short)"',
					{
						encoding: 'utf-8',
						cwd: gitRoot,
					},
				);
				const remoteBranchList = remoteBranchListRaw
					.trim()
					.split('\n')
					.filter(Boolean)
					.filter(
						b =>
							!b.includes('HEAD ->') &&
							b.startsWith(`${remoteName}/`),
					);

				remoteBranches = remoteBranchList;
			} catch (error) {
				remoteBranches = [];
			}
		}

		const mainBranch =
			branches.find(b => b === 'main' || b === 'master') || currentBranch;

		const branchOptions: Array<{
			value: string;
			label: string;
			hint?: string;
		}> = [
			{value: 'new', label: 'Create new branch'},
			{
				value: '__local_separator__',
				label: '-- ↓ Local Branches ↓ --',
				hint: '',
			} as any,
			{value: mainBranch, label: mainBranch, hint: 'local'},
		];

		if (remoteBranches.length > 0) {
			branchOptions.push({
				value: '__remote_separator__',
				label: '-- ↓ Remote Branches ↓ --',
				hint: '',
			} as any);
			remoteBranches.forEach(remoteBranch => {
				branchOptions.push({
					value: remoteBranch,
					label: remoteBranch.replace(`${remoteName}/`, ''),
					hint: 'remote',
				});
			});
		}

		const branchChoice = await p.select({
			message: 'Branch:',
			options: branchOptions,
		});

		if (p.isCancel(branchChoice)) {
			p.cancel('Operation cancelled');
			process.exit(0);
		}

		// Skip if separator was somehow selected
		if (
			branchChoice === '__local_separator__' ||
			branchChoice === '__remote_separator__'
		) {
			p.cancel('Invalid selection');
			process.exit(0);
		}

		let branchName: string;
		let baseBranch: string;
		let isRemoteBranch = false;

		if (branchChoice === 'new') {
			const newBranchName = await p.text({
				message: 'New branch name:',
				placeholder: `${currentBranch}-worktree`,
				validate: value => {
					if (!value) return 'Branch name is required';
					if (branches.includes(value))
						return 'Branch already exists';
				},
			});

			if (p.isCancel(newBranchName)) {
				p.cancel('Operation cancelled');
				process.exit(0);
			}

			branchName = newBranchName as string;
			baseBranch = currentBranch;
		} else if (
			typeof branchChoice === 'string' &&
			branchChoice.includes('/')
		) {
			isRemoteBranch = true;
			branchName = (branchChoice as string).split('/').slice(1).join('/');
			baseBranch = branchChoice as string;
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
			placeholder: `${userConfig.defaultSuffix} (ESC for full edit)`,
		});

		let worktreeName: string;

		if (p.isCancel(suffix)) {
			const defaultName = `${repoName}-${branchName}`;

			const customName = await p.text({
				message: 'Custom name:',
				defaultValue: defaultName,
				placeholder: defaultName,
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

		const s = p.spinner();
		s.start('Creating worktree...');

		try {
			if (branchChoice === 'new') {
				await execAsync(
					`git worktree add -b "${branchName}" "${worktreePath}" "${baseBranch}"`,
					{
						cwd: gitRoot,
					},
				);
			} else if (isRemoteBranch) {
				await execAsync(
					`git worktree add -b "${branchName}" "${worktreePath}" "${baseBranch}"`,
					{
						cwd: gitRoot,
					},
				);
			} else {
				let newBranchForWorktree = `${branchName}-${String(suffix) || 'wt'}`;
				let counter = 1;
				while (branches.includes(newBranchForWorktree)) {
					newBranchForWorktree = `${branchName}-${String(suffix) || 'wt'}-${counter}`;
					counter++;
				}
				await execAsync(
					`git worktree add -b "${newBranchForWorktree}" "${worktreePath}" "${baseBranch}"`,
					{
						cwd: gitRoot,
					},
				);
			}
			s.stop('Worktree created successfully!');
		} catch (error) {
			s.stop('Failed to create worktree');
			throw error;
		}

		const editorChoice = await p.select({
			message: 'Open in:',
			options: [
				{value: 'code', label: 'VS Code'},
				{value: 'default', label: 'Default ($EDITOR)'},
				{value: 'none', label: "Don't open"},
			],
			initialValue: userConfig.defaultEditor,
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
					await execAsync(`code "${worktreePath}"`);
				} else {
					const editor = process.env.EDITOR || 'vim';
					await execAsync(`${editor} "${worktreePath}"`);
				}
				s2.stop('Editor opened!');
			} catch (error) {
				s2.stop('Failed to open editor');
				console.error(
					'Error:',
					error instanceof Error ? error.message : 'Unknown error',
				);
			}
		}

		p.outro(
			`✓ Worktree ready at: ${worktreePath}\n  Branch: ${branchName}`,
		);
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
