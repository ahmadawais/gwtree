import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import * as p from '@clack/prompts';
import {exec} from 'child_process';
import {existsSync} from 'fs';
import * as config from '../config.js';
import {promisify} from 'util';

// Create a mock execAsync that we can track
const mockExecAsync = vi.fn().mockResolvedValue({stdout: '', stderr: ''});

vi.mock('child_process');
vi.mock('fs');
vi.mock('@clack/prompts');
vi.mock('../config.js');
vi.mock('util', () => ({
	promisify: vi.fn((fn: any) => {
		// Return our trackable mock when promisify is called with exec
		return mockExecAsync;
	}),
}));

// Import after mocks are set up
const {createWorktree} = await import('./create.js');

describe('createWorktree', () => {
	const mockExec = vi.mocked(exec);
	const mockExistsSync = vi.mocked(existsSync);
	const mockGetConfig = vi.mocked(config.getConfig);

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetConfig.mockReturnValue({
			defaultBranchChoice: 'current',
			defaultSuffix: '1',
			defaultOpenEditor: true,
			defaultEditor: 'code',
			namePattern: '{repo}-{branch}-wt-{suffix}',
			showRemoteBranches: true,
		});
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

	it('should create worktree with existing branch', async () => {
		mockExecAsync
			.mockResolvedValueOnce({stdout: '/home/user/repo\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'origin\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\nfeature\n', stderr: ''})
			.mockResolvedValueOnce({stdout: '', stderr: ''})
			.mockResolvedValueOnce({stdout: '', stderr: ''});

		mockExistsSync.mockReturnValue(false);
		vi.mocked(p.confirm).mockResolvedValueOnce(false);
		vi.mocked(p.select)
			.mockResolvedValueOnce('main')
			.mockResolvedValueOnce('none');
		vi.mocked(p.text).mockResolvedValueOnce('test');

		await createWorktree();

		expect(p.intro).toHaveBeenCalledWith('Create Git Worktree');
		expect(mockExecAsync).toHaveBeenCalledWith(
			'git rev-parse --show-toplevel',
			expect.any(Object),
		);
	});

	it('should create worktree with new branch', async () => {
		mockExecAsync
			.mockResolvedValueOnce({stdout: '/home/user/repo\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'origin\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\nfeature\n', stderr: ''})
			.mockResolvedValueOnce({stdout: '', stderr: ''})
			.mockResolvedValueOnce({stdout: '', stderr: ''});

		mockExistsSync.mockReturnValue(false);
		vi.mocked(p.confirm).mockResolvedValueOnce(false);
		vi.mocked(p.select)
			.mockResolvedValueOnce('new')
			.mockResolvedValueOnce('none');
		vi.mocked(p.text)
			.mockResolvedValueOnce('new-feature')
			.mockResolvedValueOnce('test');

		await createWorktree();

		expect(p.intro).toHaveBeenCalledWith('Create Git Worktree');
	});

	it('should validate new branch name is required', async () => {
		mockExecAsync
			.mockResolvedValueOnce({stdout: '/home/user/repo\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'origin\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''});

		vi.mocked(p.confirm).mockResolvedValueOnce(false);
		vi.mocked(p.select).mockResolvedValueOnce('new');

		vi.mocked(p.text).mockImplementation((opts: any) => {
			if (opts.validate) {
				expect(opts.validate('')).toBe('Branch name is required');
			}
			return Promise.resolve('test-branch');
		});

		vi.mocked(p.isCancel).mockReturnValue(true);
		const exitSpy = vi
			.spyOn(process, 'exit')
			.mockImplementation(() => undefined as never);

		await createWorktree();

		exitSpy.mockRestore();
	});

	it('should validate branch does not already exist', async () => {
		mockExecAsync
			.mockResolvedValueOnce({stdout: '/home/user/repo\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'origin\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\nexisting\n', stderr: ''});

		vi.mocked(p.confirm).mockResolvedValueOnce(false);
		vi.mocked(p.select).mockResolvedValueOnce('new');

		vi.mocked(p.text).mockImplementation((opts: any) => {
			if (opts.validate) {
				expect(opts.validate('existing')).toBe('Branch already exists');
			}
			return Promise.resolve('test-branch');
		});

		vi.mocked(p.isCancel).mockReturnValue(true);
		const exitSpy = vi
			.spyOn(process, 'exit')
			.mockImplementation(() => undefined as never);

		await createWorktree();

		exitSpy.mockRestore();
	});

	it('should handle existing directory', async () => {
		mockExecAsync
			.mockResolvedValueOnce({stdout: '/home/user/repo\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'origin\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''});

		mockExistsSync.mockReturnValue(true);
		vi.mocked(p.confirm).mockResolvedValueOnce(false);
		vi.mocked(p.select).mockResolvedValueOnce('main');
		vi.mocked(p.text).mockResolvedValueOnce('test');

		const exitSpy = vi
			.spyOn(process, 'exit')
			.mockImplementation(() => undefined as never);

		await createWorktree();

		expect(p.cancel).toHaveBeenCalledWith(
			expect.stringContaining('already exists'),
		);
		expect(exitSpy).toHaveBeenCalledWith(1);
		exitSpy.mockRestore();
	});

	it('should open VS Code when selected', async () => {
		mockExecAsync
			.mockResolvedValueOnce({stdout: '/home/user/repo\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'origin\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({stdout: '', stderr: ''})
			.mockResolvedValueOnce({stdout: '', stderr: ''})
			.mockResolvedValueOnce({stdout: '', stderr: ''});

		mockExistsSync.mockReturnValue(false);
		vi.mocked(p.confirm).mockResolvedValueOnce(false);
		vi.mocked(p.select)
			.mockResolvedValueOnce('main')
			.mockResolvedValueOnce('code');
		vi.mocked(p.text).mockResolvedValueOnce('test');

		await createWorktree();

		expect(mockExecAsync).toHaveBeenCalledWith(
			expect.stringContaining('code'),
		);
	});

	it('should open default editor when selected', async () => {
		mockExecAsync
			.mockResolvedValueOnce({stdout: '/home/user/repo\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'origin\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({stdout: '', stderr: ''})
			.mockResolvedValueOnce({stdout: '', stderr: ''})
			.mockResolvedValueOnce({stdout: '', stderr: ''});

		mockExistsSync.mockReturnValue(false);
		vi.mocked(p.confirm).mockResolvedValueOnce(false);
		vi.mocked(p.select)
			.mockResolvedValueOnce('main')
			.mockResolvedValueOnce('default');
		vi.mocked(p.text).mockResolvedValueOnce('test');

		process.env.EDITOR = 'nano';

		await createWorktree();

		expect(mockExecAsync).toHaveBeenCalledWith(
			expect.stringContaining('nano'),
		);
	});

	it('should handle editor open failure', async () => {
		mockExecAsync
			.mockResolvedValueOnce({stdout: '/home/user/repo\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'origin\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({stdout: '', stderr: ''})
			.mockResolvedValueOnce({stdout: '', stderr: ''})
			.mockRejectedValueOnce(new Error('Editor not found'));

		mockExistsSync.mockReturnValue(false);
		vi.mocked(p.confirm).mockResolvedValueOnce(false);
		vi.mocked(p.select)
			.mockResolvedValueOnce('main')
			.mockResolvedValueOnce('code');
		vi.mocked(p.text).mockResolvedValueOnce('test');

		const consoleErrorSpy = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {});

		await createWorktree();

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			'Error:',
			'Editor not found',
		);
		consoleErrorSpy.mockRestore();
	});

	it('should handle worktree creation failure', async () => {
		mockExecAsync
			.mockResolvedValueOnce({stdout: '/home/user/repo\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'origin\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({stdout: '', stderr: ''})
			.mockRejectedValueOnce(new Error('Failed to create worktree'));

		mockExistsSync.mockReturnValue(false);
		vi.mocked(p.confirm).mockResolvedValueOnce(false);
		vi.mocked(p.select).mockResolvedValueOnce('main');
		vi.mocked(p.text).mockResolvedValueOnce('test');

		await expect(createWorktree()).rejects.toThrow(
			'Failed to create worktree',
		);
	});

	it('should create unique branch name when branch exists', async () => {
		mockExecAsync
			.mockResolvedValueOnce({stdout: '/home/user/repo\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'origin\n', stderr: ''})
			.mockResolvedValueOnce({
				stdout: 'main\nmain-test\nmain-test-1\n',
				stderr: '',
			})
			.mockResolvedValueOnce({stdout: '', stderr: ''})
			.mockResolvedValueOnce({stdout: '', stderr: ''});

		mockExistsSync.mockReturnValue(false);
		vi.mocked(p.confirm).mockResolvedValueOnce(false);
		vi.mocked(p.select)
			.mockResolvedValueOnce('main')
			.mockResolvedValueOnce('none');
		vi.mocked(p.text).mockResolvedValueOnce('test');

		await createWorktree();

		expect(mockExecAsync).toHaveBeenCalledWith(
			expect.stringContaining('main-test-2'),
			expect.any(Object),
		);
	});

	it('should fetch remote branches when user confirms', async () => {
		mockExecAsync
			.mockResolvedValueOnce({stdout: '/home/user/repo\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'origin\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({
				stdout: 'origin/feature\norigin/develop\n',
				stderr: '',
			})
			.mockResolvedValueOnce({stdout: '', stderr: ''});

		mockExistsSync.mockReturnValue(false);
		vi.mocked(p.confirm).mockResolvedValueOnce(true);
		vi.mocked(p.select)
			.mockResolvedValueOnce('main')
			.mockResolvedValueOnce('none');
		vi.mocked(p.text).mockResolvedValueOnce('test');

		await createWorktree();

		// Check that the async exec function was called with the fetch command
		expect(mockExecAsync).toHaveBeenCalledWith(
			'git fetch origin',
			expect.objectContaining({cwd: '/home/user/repo'}),
		);
	});

	it('should create worktree from remote branch', async () => {
		mockExecAsync
			.mockResolvedValueOnce({stdout: '/home/user/repo\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'origin\n', stderr: ''})
			.mockResolvedValueOnce({stdout: '', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({
				stdout: 'origin/feature\norigin/develop\n',
				stderr: '',
			})
			.mockResolvedValueOnce({stdout: '', stderr: ''})
			.mockResolvedValueOnce({stdout: '', stderr: ''});

		mockExistsSync.mockReturnValue(false);
		vi.mocked(p.confirm).mockResolvedValueOnce(true);
		vi.mocked(p.select)
			.mockResolvedValueOnce('origin/feature')
			.mockResolvedValueOnce('none');
		vi.mocked(p.text).mockResolvedValueOnce('test');

		await createWorktree();

		expect(mockExecAsync).toHaveBeenCalledWith(
			expect.stringContaining('git worktree add -b "feature"'),
			expect.any(Object),
		);
		expect(mockExecAsync).toHaveBeenCalledWith(
			expect.stringContaining('origin/feature'),
			expect.any(Object),
		);
	});

	it('should skip fetch when user declines', async () => {
		mockExecAsync
			.mockResolvedValueOnce({stdout: '/home/user/repo\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'origin\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'origin/feature\n', stderr: ''})
			.mockResolvedValueOnce({stdout: '', stderr: ''});

		mockExistsSync.mockReturnValue(false);
		vi.mocked(p.confirm).mockResolvedValueOnce(false);
		vi.mocked(p.select)
			.mockResolvedValueOnce('main')
			.mockResolvedValueOnce('none');
		vi.mocked(p.text).mockResolvedValueOnce('test');

		await createWorktree();

		expect(mockExecAsync).not.toHaveBeenCalledWith(
			'git fetch origin',
			expect.any(Object),
		);
	});

	it('should not show fetch prompt when showRemoteBranches is false', async () => {
		mockGetConfig.mockReturnValue({
			defaultBranchChoice: 'current',
			defaultSuffix: '1',
			defaultOpenEditor: true,
			defaultEditor: 'code',
			namePattern: '{repo}-{branch}-wt-{suffix}',
			showRemoteBranches: false,
		});

		mockExecAsync
			.mockResolvedValueOnce({stdout: '/home/user/repo\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'origin\n', stderr: ''})
			.mockResolvedValueOnce({stdout: 'main\n', stderr: ''})
			.mockResolvedValueOnce({stdout: '', stderr: ''});

		mockExistsSync.mockReturnValue(false);
		vi.mocked(p.select)
			.mockResolvedValueOnce('main')
			.mockResolvedValueOnce('none');
		vi.mocked(p.text).mockResolvedValueOnce('test');

		await createWorktree();

		expect(p.confirm).not.toHaveBeenCalled();
	});
});
