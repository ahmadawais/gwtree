import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getConfig, setConfig, resetConfig, config, getAllWorktrees, addWorktreeRecord, removeWorktreeRecord, getWorktreeRecord, globalStore, getGlobalStorePath, getConfigPath } from './config.js';

describe('config', () => {
  beforeEach(() => {
    resetConfig();
  });

  afterEach(() => {
    resetConfig();
  });

  describe('getConfig', () => {
    it('should return default configuration', () => {
      const cfg = getConfig();
      expect(cfg).toEqual({
        editor: 'code',
        installDeps: true,
        lastPm: null
      });
    });

    it('should return updated configuration after setConfig', () => {
      setConfig('editor', 'cursor');
      const cfg = getConfig();
      expect(cfg.editor).toBe('cursor');
    });
  });

  describe('setConfig', () => {
    it('should update editor', () => {
      setConfig('editor', 'cursor');
      expect(getConfig().editor).toBe('cursor');
    });

    it('should update installDeps', () => {
      setConfig('installDeps', false);
      expect(getConfig().installDeps).toBe(false);
    });

    it('should update lastPm', () => {
      setConfig('lastPm', 'pnpm');
      expect(getConfig().lastPm).toBe('pnpm');
    });

    it('should set editor to none', () => {
      setConfig('editor', 'none');
      expect(getConfig().editor).toBe('none');
    });

    it('should set editor to default', () => {
      setConfig('editor', 'default');
      expect(getConfig().editor).toBe('default');
    });
  });

  describe('resetConfig', () => {
    it('should reset configuration to defaults', () => {
      setConfig('editor', 'none');
      setConfig('installDeps', false);
      resetConfig();
      const cfg = getConfig();
      expect(cfg.editor).toBe('code');
      expect(cfg.installDeps).toBe(true);
    });

    it('should clear all custom values', () => {
      setConfig('editor', 'cursor');
      setConfig('lastPm', 'yarn');
      resetConfig();
      const cfg = getConfig();
      expect(cfg.editor).toBe('code');
      expect(cfg.lastPm).toBe(null);
    });
  });

  describe('config object', () => {
    it('should be an instance of Conf', () => {
      expect(config).toBeDefined();
      expect(config.get).toBeDefined();
      expect(config.set).toBeDefined();
      expect(config.clear).toBeDefined();
    });

    it('should persist values across get/set operations', () => {
      config.set('lastPm', 'bun');
      expect(config.get('lastPm')).toBe('bun');
    });
  });
});

describe('worktree records', () => {
  beforeEach(() => {
    globalStore.set('worktrees', []);
  });

  afterEach(() => {
    globalStore.set('worktrees', []);
  });

  describe('getAllWorktrees', () => {
    it('should return empty array when no worktrees', () => {
      const worktrees = getAllWorktrees();
      expect(worktrees).toEqual([]);
    });

    it('should return all worktrees', () => {
      const record = {
        path: '/home/user/repo-feature',
        branch: 'feature',
        repoRoot: '/home/user/repo',
        repoName: 'repo',
        createdAt: '2025-01-01T00:00:00.000Z'
      };
      addWorktreeRecord(record);

      const worktrees = getAllWorktrees();
      expect(worktrees).toHaveLength(1);
      expect(worktrees[0]).toEqual(record);
    });
  });

  describe('addWorktreeRecord', () => {
    it('should add a worktree record', () => {
      const record = {
        path: '/home/user/repo-feature',
        branch: 'feature',
        repoRoot: '/home/user/repo',
        repoName: 'repo',
        createdAt: '2025-01-01T00:00:00.000Z'
      };

      addWorktreeRecord(record);

      const worktrees = getAllWorktrees();
      expect(worktrees).toContainEqual(record);
    });

    it('should add multiple worktree records', () => {
      const record1 = {
        path: '/home/user/repo-feature1',
        branch: 'feature1',
        repoRoot: '/home/user/repo',
        repoName: 'repo',
        createdAt: '2025-01-01T00:00:00.000Z'
      };
      const record2 = {
        path: '/home/user/repo-feature2',
        branch: 'feature2',
        repoRoot: '/home/user/repo',
        repoName: 'repo',
        createdAt: '2025-01-02T00:00:00.000Z'
      };

      addWorktreeRecord(record1);
      addWorktreeRecord(record2);

      const worktrees = getAllWorktrees();
      expect(worktrees).toHaveLength(2);
    });
  });

  describe('removeWorktreeRecord', () => {
    it('should remove a worktree record by path', () => {
      const record = {
        path: '/home/user/repo-feature',
        branch: 'feature',
        repoRoot: '/home/user/repo',
        repoName: 'repo',
        createdAt: '2025-01-01T00:00:00.000Z'
      };
      addWorktreeRecord(record);

      const removed = removeWorktreeRecord('/home/user/repo-feature');

      expect(removed).toEqual(record);
      expect(getAllWorktrees()).toHaveLength(0);
    });

    it('should return undefined when worktree not found', () => {
      const removed = removeWorktreeRecord('/nonexistent/path');
      expect(removed).toBeUndefined();
    });
  });

  describe('getWorktreeRecord', () => {
    it('should get a worktree record by path', () => {
      const record = {
        path: '/home/user/repo-feature',
        branch: 'feature',
        repoRoot: '/home/user/repo',
        repoName: 'repo',
        createdAt: '2025-01-01T00:00:00.000Z'
      };
      addWorktreeRecord(record);

      const found = getWorktreeRecord('/home/user/repo-feature');
      expect(found).toEqual(record);
    });

    it('should return undefined when worktree not found', () => {
      const found = getWorktreeRecord('/nonexistent/path');
      expect(found).toBeUndefined();
    });
  });

  describe('getGlobalStorePath', () => {
    it('should return the global store path', () => {
      const path = getGlobalStorePath();
      expect(path).toContain('.gwtree');
    });
  });

  describe('getConfigPath', () => {
    it('should return the config path', () => {
      const path = getConfigPath();
      expect(path).toBeDefined();
      expect(typeof path).toBe('string');
    });
  });
});
