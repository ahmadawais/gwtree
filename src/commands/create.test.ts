import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {createWorktree} from './create.js';
import * as p from '@clack/prompts';
import {execSync} from 'child_process';
import {existsSync} from 'fs';
import * as config from '../config.js';

vi.mock('child_process');
vi.mock('fs');
vi.mock('@clack/prompts');
vi.mock('../config.js');

describe('createWorktree', () => {
	const mockExecSync = vi.mocked(execSync);
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
		mockExecSync
			.mockReturnValueOnce('/home/user/repo\n' as any)
			.mockReturnValueOnce('main\n' as any)
			.mockReturnValueOnce('main\nfeature\n' as any)
			.mockReturnValueOnce('' as any);

		mockExistsSync.mockReturnValue(false);
		vi.mocked(p.select)
			.mockResolvedValueOnce('main')
			.mockResolvedValueOnce('none');
		vi.mocked(p.text).mockResolvedValueOnce('test');

		await createWorktree();

		expect(p.intro).toHaveBeenCalledWith('Create Git Worktree');
		expect(mockExecSync).toHaveBeenCalledWith(
			'git rev-parse --show-toplevel',
			expect.any(Object),
		);
	});

	it('should create worktree with new branch', async () => {
		mockExecSync
			.mockReturnValueOnce('/home/user/repo\n' as any)
			.mockReturnValueOnce('main\n' as any)
			.mockReturnValueOnce('main\nfeature\n' as any)
			.mockReturnValueOnce('' as any);

		mockExistsSync.mockReturnValue(false);
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
		mockExecSync
			.mockReturnValueOnce('/home/user/repo\n' as any)
			.mockReturnValueOnce('main\n' as any)
			.mockReturnValueOnce('main\n' as any);

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
		mockExecSync
			.mockReturnValueOnce('/home/user/repo\n' as any)
			.mockReturnValueOnce('main\n' as any)
			.mockReturnValueOnce('main\nexisting\n' as any);

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
		mockExecSync
			.mockReturnValueOnce('/home/user/repo\n' as any)
			.mockReturnValueOnce('main\n' as any)
			.mockReturnValueOnce('main\n' as any);

		mockExistsSync.mockReturnValue(true);
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
		mockExecSync
			.mockReturnValueOnce('/home/user/repo\n' as any)
			.mockReturnValueOnce('main\n' as any)
			.mockReturnValueOnce('main\n' as any)
			.mockReturnValueOnce('' as any)
			.mockReturnValueOnce('' as any);

		mockExistsSync.mockReturnValue(false);
		vi.mocked(p.select)
			.mockResolvedValueOnce('main')
			.mockResolvedValueOnce('code');
		vi.mocked(p.text).mockResolvedValueOnce('test');

		await createWorktree();

		expect(mockExecSync).toHaveBeenCalledWith(
			expect.stringContaining('code'),
			expect.any(Object),
		);
	});

	it('should open default editor when selected', async () => {
		mockExecSync
			.mockReturnValueOnce('/home/user/repo\n' as any)
			.mockReturnValueOnce('main\n' as any)
			.mockReturnValueOnce('main\n' as any)
			.mockReturnValueOnce('' as any)
			.mockReturnValueOnce('' as any);

		mockExistsSync.mockReturnValue(false);
		vi.mocked(p.select)
			.mockResolvedValueOnce('main')
			.mockResolvedValueOnce('default');
		vi.mocked(p.text).mockResolvedValueOnce('test');

		process.env.EDITOR = 'nano';

		await createWorktree();

		expect(mockExecSync).toHaveBeenCalledWith(
			expect.stringContaining('nano'),
			expect.any(Object),
		);
	});

	it('should handle editor open failure', async () => {
		mockExecSync
			.mockReturnValueOnce('/home/user/repo\n' as any)
			.mockReturnValueOnce('main\n' as any)
			.mockReturnValueOnce('main\n' as any)
			.mockReturnValueOnce('' as any)
			.mockImplementation(() => {
				throw new Error('Editor not found');
			});

		mockExistsSync.mockReturnValue(false);
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
		mockExecSync
			.mockReturnValueOnce('/home/user/repo\n' as any)
			.mockReturnValueOnce('main\n' as any)
			.mockReturnValueOnce('main\n' as any)
			.mockImplementation(() => {
				throw new Error('Failed to create worktree');
			});

		mockExistsSync.mockReturnValue(false);
		vi.mocked(p.select).mockResolvedValueOnce('main');
		vi.mocked(p.text).mockResolvedValueOnce('test');

		await expect(createWorktree()).rejects.toThrow(
			'Failed to create worktree',
		);
	});

	it('should create unique branch name when branch exists', async () => {
		mockExecSync
			.mockReturnValueOnce('/home/user/repo\n' as any)
			.mockReturnValueOnce('main\n' as any)
			.mockReturnValueOnce('main\nmain-test\nmain-test-1\n' as any)
			.mockReturnValueOnce('' as any);

		mockExistsSync.mockReturnValue(false);
		vi.mocked(p.select)
			.mockResolvedValueOnce('main')
			.mockResolvedValueOnce('none');
		vi.mocked(p.text).mockResolvedValueOnce('test');

		await createWorktree();

		expect(mockExecSync).toHaveBeenCalledWith(
			expect.stringContaining('main-test-2'),
			expect.any(Object),
		);
	});
});
