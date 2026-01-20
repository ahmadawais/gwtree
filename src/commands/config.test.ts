import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configCommand } from './config.js';
import { execSync } from 'child_process';
import * as config from '../config.js';

vi.mock('child_process');
vi.mock('../config.js');

describe('configCommand', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockGetConfig = vi.mocked(config.getConfig);
  const mockGetConfigPath = vi.mocked(config.getConfigPath);
  const mockResetConfig = vi.mocked(config.resetConfig);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfigPath.mockReturnValue('/home/user/.config/gwtree/config.json');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should reset config when action is reset', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await configCommand('reset');

    expect(mockResetConfig).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Config reset to defaults');

    consoleSpy.mockRestore();
  });

  it('should print config path when editor is none', async () => {
    mockGetConfig.mockReturnValue({
      editor: 'none',
      installDeps: true,
      lastPm: null
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await configCommand();

    expect(consoleSpy).toHaveBeenCalledWith('/home/user/.config/gwtree/config.json');

    consoleSpy.mockRestore();
  });

  it('should open config in VS Code when editor is code', async () => {
    mockGetConfig.mockReturnValue({
      editor: 'code',
      installDeps: true,
      lastPm: null
    });

    await configCommand();

    expect(mockExecSync).toHaveBeenCalledWith(
      'code "/home/user/.config/gwtree/config.json"',
      { stdio: 'inherit' }
    );
  });

  it('should open config in Cursor when editor is cursor', async () => {
    mockGetConfig.mockReturnValue({
      editor: 'cursor',
      installDeps: true,
      lastPm: null
    });

    await configCommand();

    expect(mockExecSync).toHaveBeenCalledWith(
      'cursor "/home/user/.config/gwtree/config.json"',
      { stdio: 'inherit' }
    );
  });

  it('should use EDITOR env var when editor is default', async () => {
    const originalEditor = process.env.EDITOR;
    process.env.EDITOR = 'nano';

    mockGetConfig.mockReturnValue({
      editor: 'default',
      installDeps: true,
      lastPm: null
    });

    await configCommand();

    expect(mockExecSync).toHaveBeenCalledWith(
      'nano "/home/user/.config/gwtree/config.json"',
      { stdio: 'inherit' }
    );

    process.env.EDITOR = originalEditor;
  });

  it('should fall back to vim when EDITOR is not set', async () => {
    const originalEditor = process.env.EDITOR;
    delete process.env.EDITOR;

    mockGetConfig.mockReturnValue({
      editor: 'default',
      installDeps: true,
      lastPm: null
    });

    await configCommand();

    expect(mockExecSync).toHaveBeenCalledWith(
      'vim "/home/user/.config/gwtree/config.json"',
      { stdio: 'inherit' }
    );

    process.env.EDITOR = originalEditor;
  });

  it('should print config path when editor command fails', async () => {
    mockGetConfig.mockReturnValue({
      editor: 'code',
      installDeps: true,
      lastPm: null
    });

    mockExecSync.mockImplementation(() => {
      throw new Error('command not found');
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await configCommand();

    expect(consoleSpy).toHaveBeenCalledWith('/home/user/.config/gwtree/config.json');

    consoleSpy.mockRestore();
  });
});
