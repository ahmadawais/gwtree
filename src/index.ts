#!/usr/bin/env node

import { Command } from 'commander';
import { createWorktree, createWorktreeBatch } from './commands/create.js';
import { rmWorktree, listWorktrees, statusWorktrees, cleanWorktrees, mergeWorktree } from './commands/list.js';
import { configCommand } from './commands/config.js';

const program = new Command();

const banner = `
╔═╗╦ ╦╔╦╗
║ ╦║║║ ║
╚═╝╚╩╝ ╩
`;

program
  .name('gwt')
  .description('Git worktree manager for parallel development')
  .version('2.0.0', '-v, --version', 'Output the version number')
  .helpOption('-h, --help', 'Display help for command');

program
  .argument('[names...]', 'Name(s) for worktree and branch (gwt foo bar creates multiple worktrees)')
  .option('-y, --yes', 'Use saved defaults, skip prompts')
  .option('-x, --no-editor', 'Skip opening editor')
  .description('Create new git worktree(s)')
  .action((names: string[], options: { yes?: boolean; editor?: boolean }) => {
    const opts = { ...options, noEditor: options.editor === false };
    if (names.length === 0) {
      createWorktree(undefined, opts);
    } else if (names.length === 1) {
      createWorktree(names[0], opts);
    } else {
      createWorktreeBatch(names, opts);
    }
  });

program
  .command('rm')
  .alias('remove')
  .description('Remove worktrees for current repo')
  .action(rmWorktree);

program
  .command('ls')
  .alias('list')
  .description('List worktrees for current repo')
  .action(listWorktrees);

program
  .command('status')
  .alias('st')
  .description('Show status of all worktrees (changes, commits ahead/behind)')
  .action(statusWorktrees);

program
  .command('clean')
  .alias('c')
  .option('-a, --all', 'Remove all worktrees (not just merged)')
  .description('Remove worktrees that have been merged to main')
  .action(cleanWorktrees);

program
  .command('merge <name>')
  .alias('m')
  .description('Merge worktree branch to main and remove worktree')
  .action(mergeWorktree);

program
  .command('config [action]')
  .description('Open config file (gwt config) or reset defaults (gwt config reset)')
  .action(configCommand);

program
  .command('version')
  .description('Show version number')
  .action(() => {
    console.log('2.0.0');
  });

program
  .command('help')
  .description('Show help')
  .action(() => {
    program.help();
  });

// Get reserved commands from commander
const reservedCommands = program.commands.flatMap(cmd => [cmd.name(), ...cmd.aliases()]);

const arg = process.argv[2];
const isVersionFlag = process.argv.includes('-v') || process.argv.includes('--version');
const isHelpFlag = process.argv.includes('-h') || process.argv.includes('--help');
const isYesFlag = process.argv.includes('-y') || process.argv.includes('--yes');
const hasArg = arg && !arg.startsWith('-') && !reservedCommands.includes(arg);

// Hide banner in fast mode or version/help
if (!isVersionFlag && !isHelpFlag && !(hasArg && isYesFlag) && arg !== 'version' && arg !== 'help') {
  console.log(banner);
}

program.parse();
