import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { listWorktrees } from './list.js';
import * as p from '@clack/prompts';
import { execSync } from 'child_process';

vi.mock('child_process');
vi.mock('@clack/prompts');

describe('listWorktrees', () => {
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
      message: vi.fn()
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle no worktrees found', async () => {
    const worktreeOutput = `worktree /home/user/repo
HEAD abc1234
branch refs/heads/main
`;

    mockExecSync.mockReturnValueOnce(worktreeOutput as any);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    try {
      await listWorktrees();
    } catch (e) {
      // Expected to exit
    }

    expect(p.cancel).toHaveBeenCalledWith('No worktrees found');
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

    await expect(listWorktrees()).rejects.toThrow('Failed to remove worktree');
  });
});
