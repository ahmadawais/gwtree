import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { listWorktrees, rmWorktree, statusWorktrees, cleanWorktrees, mergeWorktree } from './list.js';
import * as p from '@clack/prompts';
import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import * as config from '../config.js';

vi.mock('child_process');
vi.mock('fs');
vi.mock('@clack/prompts');
vi.mock('../config.js');
vi.mock('@inquirer/prompts', () => ({
  search: vi.fn()
}));

describe('listWorktrees', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockExistsSync = vi.mocked(existsSync);
  const mockGetAllWorktrees = vi.mocked(config.getAllWorktrees);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(p.intro).mockImplementation(() => {});
    vi.mocked(p.cancel).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should list worktrees for current repo', async () => {
    mockExecSync.mockReturnValueOnce('/home/user/repo\n' as any);
    mockGetAllWorktrees.mockReturnValue([
      { path: '/home/user/repo-feature', branch: 'feature', repoRoot: '/home/user/repo', repoName: 'repo', createdAt: '' }
    ]);
    mockExistsSync.mockReturnValue(true);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await listWorktrees();

    expect(p.intro).toHaveBeenCalledWith(expect.stringContaining('repo'));
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should handle no worktrees found', async () => {
    mockExecSync.mockReturnValueOnce('/home/user/repo\n' as any);
    mockGetAllWorktrees.mockReturnValue([]);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await listWorktrees();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No worktrees'));
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should handle not in git repository', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('not a git repository');
    });

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    try {
      await listWorktrees();
    } catch {
      // Expected - process.exit is mocked so code falls through
    }

    expect(p.cancel).toHaveBeenCalledWith('Not in a git repository');
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });
});

describe('statusWorktrees', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockExistsSync = vi.mocked(existsSync);
  const mockGetAllWorktrees = vi.mocked(config.getAllWorktrees);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(p.intro).mockImplementation(() => {});
    vi.mocked(p.cancel).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should show status for all worktrees', async () => {
    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any) // git root
      .mockReturnValueOnce('main\n' as any); // branches

    mockGetAllWorktrees.mockReturnValue([
      { path: '/home/user/repo-feature', branch: 'feature', repoRoot: '/home/user/repo', repoName: 'repo', createdAt: '' }
    ]);
    mockExistsSync.mockReturnValue(true);

    // Mock status calls
    mockExecSync
      .mockReturnValueOnce('' as any) // git status
      .mockReturnValueOnce('' as any) // diff stat
      .mockReturnValueOnce('feature\n' as any) // branch
      .mockReturnValueOnce('0\t1\n' as any) // rev-list
      .mockReturnValueOnce('feature\n' as any) // branch for merge check
      .mockReturnValueOnce('' as any); // merged branches

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await statusWorktrees();

    expect(p.intro).toHaveBeenCalledWith(expect.stringContaining('Status'));
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should handle no worktrees found', async () => {
    mockExecSync.mockReturnValueOnce('/home/user/repo\n' as any);
    mockGetAllWorktrees.mockReturnValue([]);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await statusWorktrees();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No worktrees'));
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});

describe('cleanWorktrees', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockExistsSync = vi.mocked(existsSync);
  const mockRmSync = vi.mocked(rmSync);
  const mockGetAllWorktrees = vi.mocked(config.getAllWorktrees);
  const mockRemoveWorktreeRecord = vi.mocked(config.removeWorktreeRecord);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(p.intro).mockImplementation(() => {});
    vi.mocked(p.cancel).mockImplementation(() => {});
    vi.mocked(p.confirm).mockResolvedValue(true);
    vi.mocked(p.isCancel).mockReturnValue(false);
    mockRemoveWorktreeRecord.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should clean merged worktrees', async () => {
    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any)
      .mockReturnValueOnce('main\n' as any);

    mockGetAllWorktrees.mockReturnValue([
      { path: '/home/user/repo-feature', branch: 'feature', repoRoot: '/home/user/repo', repoName: 'repo', createdAt: '' }
    ]);
    mockExistsSync.mockReturnValue(true);

    // Mock merged check
    mockExecSync
      .mockReturnValueOnce('' as any) // status
      .mockReturnValueOnce('' as any) // diff
      .mockReturnValueOnce('feature\n' as any) // branch
      .mockReturnValueOnce('0\t0\n' as any) // rev-list
      .mockReturnValueOnce('feature\n' as any) // branch
      .mockReturnValueOnce('feature\n' as any) // merged branches (is merged)
      .mockReturnValueOnce('' as any); // remove

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await cleanWorktrees();

    expect(p.intro).toHaveBeenCalledWith('Clean Merged Worktrees');
    expect(mockRemoveWorktreeRecord).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should clean all worktrees with --all flag', async () => {
    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any)
      .mockReturnValueOnce('main\n' as any)
      .mockReturnValueOnce('' as any); // remove

    mockGetAllWorktrees.mockReturnValue([
      { path: '/home/user/repo-feature', branch: 'feature', repoRoot: '/home/user/repo', repoName: 'repo', createdAt: '' }
    ]);
    mockExistsSync.mockReturnValue(true);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await cleanWorktrees({ all: true });

    expect(p.intro).toHaveBeenCalledWith('Clean All Worktrees');

    consoleSpy.mockRestore();
  });

  it('should handle no worktrees to clean', async () => {
    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any)
      .mockReturnValueOnce('main\n' as any);

    mockGetAllWorktrees.mockReturnValue([
      { path: '/home/user/repo-feature', branch: 'feature', repoRoot: '/home/user/repo', repoName: 'repo', createdAt: '' }
    ]);
    mockExistsSync.mockReturnValue(true);

    // Mock not merged
    mockExecSync
      .mockReturnValueOnce('' as any)
      .mockReturnValueOnce('' as any)
      .mockReturnValueOnce('feature\n' as any)
      .mockReturnValueOnce('0\t1\n' as any) // ahead
      .mockReturnValueOnce('feature\n' as any)
      .mockReturnValueOnce('' as any); // not merged

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await cleanWorktrees();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No worktrees to clean'));
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});

describe('mergeWorktree', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockExistsSync = vi.mocked(existsSync);
  const mockGetAllWorktrees = vi.mocked(config.getAllWorktrees);
  const mockRemoveWorktreeRecord = vi.mocked(config.removeWorktreeRecord);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(p.intro).mockImplementation(() => {});
    vi.mocked(p.cancel).mockImplementation(() => {});
    mockRemoveWorktreeRecord.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should merge worktree branch and remove', async () => {
    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any) // git root
      .mockReturnValueOnce('main\n' as any); // branches

    mockGetAllWorktrees.mockReturnValue([
      { path: '/home/user/repo-feature', branch: 'feature', repoRoot: '/home/user/repo', repoName: 'repo', createdAt: '' }
    ]);
    mockExistsSync.mockReturnValue(true);

    // Mock status check (no uncommitted changes)
    mockExecSync
      .mockReturnValueOnce('' as any) // status
      .mockReturnValueOnce('' as any) // diff
      .mockReturnValueOnce('feature\n' as any) // branch
      .mockReturnValueOnce('0\t1\n' as any) // rev-list
      .mockReturnValueOnce('feature\n' as any) // branch
      .mockReturnValueOnce('' as any) // merged
      .mockReturnValueOnce('' as any) // checkout main
      .mockReturnValueOnce('' as any) // merge
      .mockReturnValueOnce('' as any) // remove worktree
      .mockReturnValueOnce('' as any); // delete branch

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await mergeWorktree('feature');

    expect(p.intro).toHaveBeenCalledWith(expect.stringContaining('Merge'));
    expect(mockRemoveWorktreeRecord).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should reject merge with uncommitted changes', async () => {
    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any)
      .mockReturnValueOnce('main\n' as any);

    mockGetAllWorktrees.mockReturnValue([
      { path: '/home/user/repo-feature', branch: 'feature', repoRoot: '/home/user/repo', repoName: 'repo', createdAt: '' }
    ]);
    mockExistsSync.mockReturnValue(true);

    // Mock status check (has uncommitted changes)
    mockExecSync
      .mockReturnValueOnce('M file.txt\n' as any) // status - has changes
      .mockReturnValueOnce('' as any)
      .mockReturnValueOnce('feature\n' as any)
      .mockReturnValueOnce('0\t1\n' as any)
      .mockReturnValueOnce('feature\n' as any)
      .mockReturnValueOnce('' as any);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await mergeWorktree('feature');

    expect(p.cancel).toHaveBeenCalledWith(expect.stringContaining('uncommitted changes'));
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });

  it('should handle worktree not found', async () => {
    mockExecSync.mockReturnValueOnce('/home/user/repo\n' as any);
    mockGetAllWorktrees.mockReturnValue([]);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    try {
      await mergeWorktree('nonexistent');
    } catch {
      // Expected - process.exit is mocked so code falls through
    }

    expect(p.cancel).toHaveBeenCalledWith(expect.stringContaining('not found'));
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });
});

describe('rmWorktree', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockExistsSync = vi.mocked(existsSync);
  const mockGetAllWorktrees = vi.mocked(config.getAllWorktrees);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(p.intro).mockImplementation(() => {});
    vi.mocked(p.cancel).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle no worktrees found', async () => {
    mockExecSync.mockReturnValueOnce('/home/user/repo\n' as any);
    mockGetAllWorktrees.mockReturnValue([]);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      await rmWorktree();
    } catch {
      // Expected - process.exit is mocked so code falls through
    }

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No worktrees'));
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should handle not in git repository', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('not a git repository');
    });

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    try {
      await rmWorktree();
    } catch {
      // Expected
    }

    expect(p.cancel).toHaveBeenCalledWith('Not in a git repository');
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });
});

describe('statusWorktrees error handling', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockGetAllWorktrees = vi.mocked(config.getAllWorktrees);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(p.intro).mockImplementation(() => {});
    vi.mocked(p.cancel).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle not in git repository', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('not a git repository');
    });

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    try {
      await statusWorktrees();
    } catch {
      // Expected
    }

    expect(p.cancel).toHaveBeenCalledWith('Not in a git repository');
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });
});

describe('cleanWorktrees error handling', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockGetAllWorktrees = vi.mocked(config.getAllWorktrees);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(p.intro).mockImplementation(() => {});
    vi.mocked(p.cancel).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle not in git repository', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('not a git repository');
    });

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    try {
      await cleanWorktrees();
    } catch {
      // Expected
    }

    expect(p.cancel).toHaveBeenCalledWith('Not in a git repository');
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });

  it('should handle no worktrees found', async () => {
    mockExecSync
      .mockReturnValueOnce('/home/user/repo\n' as any)
      .mockReturnValueOnce('main\n' as any);

    mockGetAllWorktrees.mockReturnValue([]);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      await cleanWorktrees();
    } catch {
      // Expected
    }

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No worktrees'));
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});

describe('mergeWorktree error handling', () => {
  const mockExecSync = vi.mocked(execSync);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(p.intro).mockImplementation(() => {});
    vi.mocked(p.cancel).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle not in git repository', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('not a git repository');
    });

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    try {
      await mergeWorktree('feature');
    } catch {
      // Expected
    }

    expect(p.cancel).toHaveBeenCalledWith('Not in a git repository');
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });
});
