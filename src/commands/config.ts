import { execSync } from 'child_process';
import { getConfig, getConfigPath, resetConfig } from '../config.js';

export async function configCommand(action?: string) {
  // gwt config reset - reset to defaults
  if (action === 'reset') {
    resetConfig();
    console.log('Config reset to defaults');
    return;
  }

  // gwt config - open config file
  const cfg = getConfig();
  const configPath = getConfigPath();
  const editor = cfg.editor === 'default' ? (process.env.EDITOR || 'vim') : cfg.editor;

  if (editor === 'none') {
    console.log(configPath);
    return;
  }

  try {
    execSync(`${editor === 'code' ? 'code' : editor === 'cursor' ? 'cursor' : editor} "${configPath}"`, { stdio: 'inherit' });
  } catch {
    console.log(configPath);
  }
}
