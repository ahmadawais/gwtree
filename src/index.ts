#!/usr/bin/env node

import { Command } from 'commander';
import { createWorktree } from './commands/create.js';

const program = new Command();

const banner = `
 ██████╗ ██╗    ██╗████████╗██████╗ ███████╗███████╗
██╔════╝ ██║    ██║╚══██╔══╝██╔══██╗██╔════╝██╔════╝
██║  ███╗██║ █╗ ██║   ██║   ██████╔╝█████╗  █████╗  
██║   ██║██║███╗██║   ██║   ██╔══██╗██╔══╝  ██╔══╝  
╚██████╔╝╚███╔███╔╝   ██║   ██║  ██║███████╗███████╗
 ╚═════╝  ╚══╝╚══╝    ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝
`;

console.log(banner);

program
  .name('gwtree')
  .description('Git worktree manager for parallel development')
  .version('0.0.1', '-v, --version', 'Output the version number')
  .helpOption('-h, --help', 'Display help for command');

program
  .command('create', { isDefault: true })
  .description('Create a new git worktree')
  .action(createWorktree);

program.parse();
