import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createWorktree, createWorktreeBatch } from './create.js';
import * as p from '@clack/prompts';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import * as config from '../config.js';

vi.mock('child_process');
vi.mock('fs');
vi.mock('@clack/prompts');
vi.mock('../config.js');

describe('createWorktree', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockExistsSync = vi.mocked(existsSync);
  const mockGetConfig = vi.mocked(config.getConfig);
  const mockAddWorktreeRecord = vi.mocked(config.addWorktreeRecord);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockReturnValue({
      editor: 'none',
      installDeps: false,
      lastPm: null
    });
    mockAddWorktreeRecord.mockImplementation(() => {});
    vi.mocked(p.intro).mockImplementation(() => {});
    vi.mocked(p.outro).mockImplementation(() => {});
    vi.mocked(p.cancel).mockImplementation(() => {});
    vi.mocked(p.isCancel).mockReturnValue(false);
    vi.mocked(p.log.info).mockImplementation(() => {});
    vi.mocked(p.log.message).mockImplementation(() => {});
    vi.mocked(p.log.step).mockImplementation(() => {});
    vi.mocked(p.log.error).mockImplementation(() => {});
    vi.mocked(p.log.warn).mockImplementation(() => {});
    vi.mocked(p.log.success).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create worktree with branch argument', async () => {
    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any) // git root
      .mockReturnValueOnce('main\n' as any) // current branch
      .mockReturnValueOnce('main\n' as any) // branches
      .mockReturnValueOnce('' as any) // status
      .mockReturnValueOnce('' as any) // remote
      .mockReturnValueOnce('' as any) // prune
      .mockReturnValueOnce('' as any); // worktree add

    mockExistsSync.mockReturnValue(false);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await createWorktree('feature-test', { yes: true });

    expect(p.intro).toHaveBeenCalledWith('Create Git Worktree');
    expect(mockExecSync).toHaveBeenCalledWith('git rev-parse --show-toplevel', expect.any(Object));
    expect(mockAddWorktreeRecord).toHaveBeenCalled();

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should handle existing directory error', async () => {
    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any)
      .mockReturnValueOnce('main\n' as any)
      .mockReturnValueOnce('main\n' as any)
      .mockReturnValueOnce('' as any);

    mockExistsSync.mockReturnValue(true);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await createWorktree('test', { yes: true });

    expect(p.cancel).toHaveBeenCalledWith(expect.stringContaining('already exists'));
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });

  it('should create unique branch name when branch exists', async () => {
    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any)
      .mockReturnValueOnce('main\n' as any)
      .mockReturnValueOnce('main\ntest\ntest-1\n' as any)
      .mockReturnValueOnce('' as any)
      .mockReturnValueOnce('' as any)
      .mockReturnValueOnce('' as any)
      .mockReturnValueOnce('' as any);

    mockExistsSync.mockReturnValue(false);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await createWorktree('test', { yes: true });

    // Should create test-2 since test and test-1 exist
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('test-2'),
      expect.any(Object)
    );

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should handle not a git repository error', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('not a git repository');
    });

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    try {
      await createWorktree('test');
    } catch {
      // Expected - process.exit is mocked so code falls through
    }

    expect(p.cancel).toHaveBeenCalledWith('Not in a git repository');
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });

  it('should stash changes when option selected', async () => {
    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any) // git root
      .mockReturnValueOnce('main\n' as any) // current branch
      .mockReturnValueOnce('main\n' as any) // branches
      .mockReturnValueOnce('M file.txt\n' as any) // status - has changes
      .mockReturnValueOnce('' as any) // stash
      .mockReturnValueOnce('' as any) // remote
      .mockReturnValueOnce('' as any) // prune
      .mockReturnValueOnce('' as any); // worktree add

    mockExistsSync.mockReturnValue(false);
    vi.mocked(p.select).mockResolvedValueOnce('stash');

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await createWorktree('test');

    expect(mockExecSync).toHaveBeenCalledWith('git stash', expect.any(Object));

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should switch to main branch when not on main', async () => {
    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any)
      .mockReturnValueOnce('feature\n' as any) // not on main
      .mockReturnValueOnce('main\nfeature\n' as any)
      .mockReturnValueOnce('' as any) // no changes
      .mockReturnValueOnce('' as any) // switch to main
      .mockReturnValueOnce('' as any) // remote
      .mockReturnValueOnce('' as any) // prune
      .mockReturnValueOnce('' as any); // worktree add

    mockExistsSync.mockReturnValue(false);
    vi.mocked(p.select).mockResolvedValueOnce('switch');

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await createWorktree('test');

    expect(mockExecSync).toHaveBeenCalledWith('git checkout main', expect.any(Object));

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should skip editor when noEditor option is true', async () => {
    mockGetConfig.mockReturnValue({
      editor: 'code',
      installDeps: false,
      lastPm: null
    });

    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any)
      .mockReturnValueOnce('main\n' as any)
      .mockReturnValueOnce('main\n' as any)
      .mockReturnValueOnce('' as any)
      .mockReturnValueOnce('' as any)
      .mockReturnValueOnce('' as any)
      .mockReturnValueOnce('' as any);

    mockExistsSync.mockReturnValue(false);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await createWorktree('test', { yes: true, noEditor: true });

    // Should not call code editor
    const codeCalls = mockExecSync.mock.calls.filter(call =>
      typeof call[0] === 'string' && call[0].startsWith('code ')
    );
    expect(codeCalls).toHaveLength(0);

    consoleSpy.mockRestore();
  });

  it('should open with cursor editor when configured', async () => {
    mockGetConfig.mockReturnValue({
      editor: 'cursor',
      installDeps: false,
      lastPm: null
    });

    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any)
      .mockReturnValueOnce('main\n' as any)
      .mockReturnValueOnce('main\n' as any)
      .mockReturnValueOnce('' as any)
      .mockReturnValueOnce('' as any)
      .mockReturnValueOnce('' as any)
      .mockReturnValueOnce('' as any)
      .mockReturnValueOnce('' as any); // cursor open

    mockExistsSync.mockReturnValue(false);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await createWorktree('test', { yes: true });

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('cursor'),
      expect.any(Object)
    );

    consoleSpy.mockRestore();
  });

  it('should handle editor open failure gracefully', async () => {
    mockGetConfig.mockReturnValue({
      editor: 'code',
      installDeps: false,
      lastPm: null
    });

    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any)
      .mockReturnValueOnce('main\n' as any)
      .mockReturnValueOnce('main\n' as any)
      .mockReturnValueOnce('' as any)
      .mockReturnValueOnce('' as any)
      .mockReturnValueOnce('' as any)
      .mockReturnValueOnce('' as any)
      .mockImplementationOnce(() => { throw new Error('code not found'); }); // editor fails

    mockExistsSync.mockReturnValue(false);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await createWorktree('test', { yes: true });

    // Should still complete despite editor failure
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Done'));

    consoleSpy.mockRestore();
  });

  it('should handle pull rebase failure gracefully', async () => {
    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any)
      .mockReturnValueOnce('main\n' as any)
      .mockReturnValueOnce('main\n' as any)
      .mockReturnValueOnce('' as any) // no changes
      .mockReturnValueOnce('origin\n' as any) // has remote
      .mockImplementationOnce(() => { throw new Error('rebase failed'); }) // pull fails
      .mockReturnValueOnce('' as any) // prune
      .mockReturnValueOnce('' as any); // worktree add

    mockExistsSync.mockReturnValue(false);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await createWorktree('test', { yes: true });

    // Should continue despite pull failure
    expect(mockAddWorktreeRecord).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe('createWorktreeBatch', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockExistsSync = vi.mocked(existsSync);
  const mockGetConfig = vi.mocked(config.getConfig);
  const mockAddWorktreeRecord = vi.mocked(config.addWorktreeRecord);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockReturnValue({
      editor: 'none',
      installDeps: false,
      lastPm: null
    });
    mockAddWorktreeRecord.mockImplementation(() => {});
    vi.mocked(p.intro).mockImplementation(() => {});
    vi.mocked(p.cancel).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create multiple worktrees in batch', async () => {
    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any) // git root
      .mockReturnValueOnce('main\n' as any) // branches
      .mockReturnValueOnce('' as any) // prune
      .mockReturnValueOnce('' as any) // worktree add 1
      .mockReturnValueOnce('' as any); // worktree add 2

    mockExistsSync.mockReturnValue(false);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await createWorktreeBatch(['feature-a', 'feature-b']);

    expect(p.intro).toHaveBeenCalledWith('Create 2 Git Worktrees');
    expect(mockAddWorktreeRecord).toHaveBeenCalledTimes(2);

    consoleSpy.mockRestore();
  });

  it('should skip existing worktrees in batch', async () => {
    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any)
      .mockReturnValueOnce('main\n' as any)
      .mockReturnValueOnce('' as any) // prune
      .mockReturnValueOnce('' as any); // worktree add 2 only

    // First worktree exists, second doesn't
    mockExistsSync
      .mockReturnValueOnce(true) // feature-a exists
      .mockReturnValueOnce(false); // feature-b doesn't exist

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await createWorktreeBatch(['feature-a', 'feature-b']);

    // Should only create one worktree
    expect(mockAddWorktreeRecord).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });

  it('should handle not a git repository error', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('not a git repository');
    });

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    try {
      await createWorktreeBatch(['feature-a']);
    } catch {
      // Expected - process.exit is mocked so code falls through
    }

    expect(p.cancel).toHaveBeenCalledWith('Not in a git repository');
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });

  it('should handle batch with all existing worktrees', async () => {
    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any)
      .mockReturnValueOnce('main\n' as any)
      .mockReturnValueOnce('' as any); // prune

    // All worktrees exist
    mockExistsSync.mockReturnValue(true);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await createWorktreeBatch(['feature-a', 'feature-b']);

    // Should show "No worktrees created"
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No worktrees created'));

    consoleSpy.mockRestore();
  });

  it('should open editor in batch mode when configured', async () => {
    mockGetConfig.mockReturnValue({
      editor: 'code',
      installDeps: false,
      lastPm: null
    });

    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any)
      .mockReturnValueOnce('main\n' as any)
      .mockReturnValueOnce('' as any) // prune
      .mockReturnValueOnce('' as any) // worktree add
      .mockReturnValueOnce('' as any); // code open

    mockExistsSync.mockReturnValue(false);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await createWorktreeBatch(['feature-a']);

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('code'),
      expect.any(Object)
    );

    consoleSpy.mockRestore();
  });

  it('should handle worktree creation failure in batch', async () => {
    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any)
      .mockReturnValueOnce('main\n' as any)
      .mockReturnValueOnce('' as any) // prune
      .mockImplementationOnce(() => { throw new Error('worktree add failed'); }); // worktree add fails

    mockExistsSync.mockReturnValue(false);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await createWorktreeBatch(['feature-a']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed'));

    consoleSpy.mockRestore();
  });

  it('should skip editor in batch with noEditor option', async () => {
    mockGetConfig.mockReturnValue({
      editor: 'code',
      installDeps: false,
      lastPm: null
    });

    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any)
      .mockReturnValueOnce('main\n' as any)
      .mockReturnValueOnce('' as any) // prune
      .mockReturnValueOnce('' as any); // worktree add

    mockExistsSync.mockReturnValue(false);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await createWorktreeBatch(['feature-a'], { noEditor: true });

    // Should not call code
    const codeCalls = mockExecSync.mock.calls.filter(call =>
      typeof call[0] === 'string' && call[0].startsWith('code ')
    );
    expect(codeCalls).toHaveLength(0);

    consoleSpy.mockRestore();
  });

  it('should open cursor editor in batch mode', async () => {
    mockGetConfig.mockReturnValue({
      editor: 'cursor',
      installDeps: false,
      lastPm: null
    });

    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any)
      .mockReturnValueOnce('main\n' as any)
      .mockReturnValueOnce('' as any) // prune
      .mockReturnValueOnce('' as any) // worktree add
      .mockReturnValueOnce('' as any); // cursor open

    mockExistsSync.mockReturnValue(false);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await createWorktreeBatch(['feature-a']);

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('cursor'),
      expect.any(Object)
    );

    consoleSpy.mockRestore();
  });

  it('should install dependencies in batch when configured', async () => {
    mockGetConfig.mockReturnValue({
      editor: 'none',
      installDeps: true,
      lastPm: 'pnpm'
    });

    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any)
      .mockReturnValueOnce('main\n' as any)
      .mockReturnValueOnce('' as any) // prune
      .mockReturnValueOnce('' as any) // worktree add
      .mockReturnValueOnce('' as any); // pnpm install

    mockExistsSync.mockReturnValue(false);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await createWorktreeBatch(['feature-a']);

    expect(mockExecSync).toHaveBeenCalledWith(
      'pnpm install',
      expect.any(Object)
    );

    consoleSpy.mockRestore();
  });
});
