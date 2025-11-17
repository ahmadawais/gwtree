import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {removeWorktree} from './remove.js';
import * as p from '@clack/prompts';
import {execSync} from 'child_process';

vi.mock('child_process');
vi.mock('@clack/prompts');

describe('removeWorktree', () => {
	const mockExecSync = vi.mocked(execSync);

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(p.intro).mockImplementation(() => {});
		vi.mocked(p.outro).mockImplementation(() => {});
		vi.mocked(p.cancel).mockImplementation(() => {});
		vi.mocked(p.isCancel).mockReturnValue(false);
		vi.mocked(p.spinner).mockReturnValue({
			start: vi.fn(),
			stop: vi.fn(),
			message: vi.fn(),
		} as any);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should remove selected worktree', async () => {
		const worktreeOutput = `worktree /home/user/repo
HEAD abc1234
branch refs/heads/main

worktree /home/user/repo-feature
HEAD def5678
branch refs/heads/feature
`;

		mockExecSync
			.mockReturnValueOnce(worktreeOutput as any)
			.mockReturnValueOnce('' as any);

		vi.mocked(p.select).mockResolvedValueOnce('/home/user/repo-feature');
		vi.mocked(p.confirm).mockResolvedValueOnce(true);

		await removeWorktree();

		expect(p.intro).toHaveBeenCalledWith('Remove Git Worktree');
		expect(mockExecSync).toHaveBeenCalledWith(
			'git worktree list --porcelain',
			expect.any(Object),
		);
		expect(mockExecSync).toHaveBeenCalledWith(
			'git worktree remove "/home/user/repo-feature"',
			expect.any(Object),
		);
		expect(p.outro).toHaveBeenCalledWith('✓ Done');
	});

	it('should handle no worktrees to remove', async () => {
		const worktreeOutput = `worktree /home/user/repo
HEAD abc1234
branch refs/heads/main
`;

		mockExecSync.mockReturnValueOnce(worktreeOutput as any);

		const exitSpy = vi
			.spyOn(process, 'exit')
			.mockImplementation(() => undefined as never);

		await removeWorktree();

		expect(p.cancel).toHaveBeenCalledWith('No worktrees to remove');
		expect(exitSpy).toHaveBeenCalledWith(0);
		exitSpy.mockRestore();
	});

	it('should handle worktree removal failure', async () => {
		const worktreeOutput = `worktree /home/user/repo
HEAD abc1234
branch refs/heads/main

worktree /home/user/repo-feature
HEAD def5678
branch refs/heads/feature
`;

		mockExecSync
			.mockReturnValueOnce(worktreeOutput as any)
			.mockImplementation(() => {
				throw new Error('Failed to remove worktree');
			});

		vi.mocked(p.select).mockResolvedValueOnce('/home/user/repo-feature');
		vi.mocked(p.confirm).mockResolvedValueOnce(true);

		await expect(removeWorktree()).rejects.toThrow(
			'Failed to remove worktree',
		);
	});

	it('should parse worktrees without branch (detached HEAD)', async () => {
		const worktreeOutput = `worktree /home/user/repo
HEAD abc1234
branch refs/heads/main

worktree /home/user/repo-detached
HEAD def5678
`;

		mockExecSync
			.mockReturnValueOnce(worktreeOutput as any)
			.mockReturnValueOnce('' as any);

		vi.mocked(p.select).mockResolvedValueOnce('/home/user/repo-detached');
		vi.mocked(p.confirm).mockResolvedValueOnce(true);

		await removeWorktree();

		expect(p.select).toHaveBeenCalledWith(
			expect.objectContaining({
				options: expect.arrayContaining([
					expect.objectContaining({
						label: expect.stringContaining('def5678'),
					}),
				]),
			}),
		);
	});
});
