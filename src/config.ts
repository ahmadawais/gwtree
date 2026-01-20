import Conf from 'conf';
import { homedir } from 'os';
import { join } from 'path';

export interface WorktreeRecord {
  path: string;
  branch: string;
  repoRoot: string;
  repoName: string;
  createdAt: string;
}

export interface GWTreeConfig {
  editor: 'code' | 'cursor' | 'default' | 'none';
  installDeps: boolean;
  lastPm: 'pnpm' | 'npm' | 'yarn' | 'bun' | null;
}

export interface GWTreeGlobalStore {
  worktrees: WorktreeRecord[];
}

const configSchema = {
  editor: {
    type: 'string',
    enum: ['code', 'cursor', 'default', 'none'],
    default: 'code'
  },
  installDeps: {
    type: 'boolean',
    default: true
  },
  lastPm: {
    type: ['string', 'null'],
    enum: ['pnpm', 'npm', 'yarn', 'bun', null],
    default: null
  }
} as const;

const storeSchema = {
  worktrees: {
    type: 'array',
    default: []
  }
} as const;

export const config = new Conf<GWTreeConfig>({
  projectName: 'gwtree',
  schema: configSchema
});

export const globalStore = new Conf<GWTreeGlobalStore>({
  projectName: 'gwtree',
  configName: 'worktrees',
  cwd: join(homedir(), '.gwtree'),
  schema: storeSchema
});

export function getConfig(): GWTreeConfig {
  return {
    editor: config.get('editor'),
    installDeps: config.get('installDeps'),
    lastPm: config.get('lastPm')
  };
}

export function setConfig<K extends keyof GWTreeConfig>(key: K, value: GWTreeConfig[K]): void {
  config.set(key, value);
}

export function resetConfig(): void {
  config.clear();
}

export function getAllWorktrees(): WorktreeRecord[] {
  return globalStore.get('worktrees') || [];
}

export function addWorktreeRecord(record: WorktreeRecord): void {
  const worktrees = globalStore.get('worktrees') || [];
  worktrees.push(record);
  globalStore.set('worktrees', worktrees);
}

export function removeWorktreeRecord(worktreePath: string): WorktreeRecord | undefined {
  const worktrees = globalStore.get('worktrees') || [];
  const index = worktrees.findIndex(w => w.path === worktreePath);
  if (index !== -1) {
    const removed = worktrees.splice(index, 1)[0];
    globalStore.set('worktrees', worktrees);
    return removed;
  }
  return undefined;
}

export function getWorktreeRecord(worktreePath: string): WorktreeRecord | undefined {
  const worktrees = globalStore.get('worktrees') || [];
  return worktrees.find(w => w.path === worktreePath);
}

export function getGlobalStorePath(): string {
  return join(homedir(), '.gwtree');
}

export function getConfigPath(): string {
  return config.path;
}
