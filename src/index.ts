#!/usr/bin/env node

import { Command } from 'commander';
import { createWorktree } from './commands/create.js';
import { listWorktrees } from './commands/list.js';
import { removeWorktree } from './commands/remove.js';

const program = new Command();

const banner = `
 ██████╗ ██╗    ██╗████████╗
██╔════╝ ██║    ██║╚══██╔══╝
██║  ███╗██║ █╗ ██║   ██║   
██║   ██║██║███╗██║   ██║   
╚██████╔╝╚███╔███╔╝   ██║   
 ╚═════╝  ╚══╝╚══╝    ╚═╝   
`;

console.log(banner);

program
  .name('gwtree')
  .description('Git worktree manager for parallel development')
  .version('1.1.2', '-v, --version', 'Output the version number')
  .helpOption('-h, --help', 'Display help for command');

program
  .command('create', { isDefault: true })
  .description('Create a new git worktree')
  .action(createWorktree);

program
  .command('list')
  .alias('ls')
  .description('List all git worktrees')
  .action(listWorktrees);

program
  .command('remove')
  .alias('rm')
  .description('Remove a git worktree')
  .action(removeWorktree);

program.parse();
