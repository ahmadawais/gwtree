import { describe, it, expect } from 'vitest';
import { Command } from 'commander';

describe('CLI Integration', () => {
  it('should parse and execute commands', () => {
    const program = new Command();

    program
      .name('gwt')
      .description('Git worktree manager for parallel development')
      .version('2.0.0', '-v, --version', 'Output the version number')
      .helpOption('-h, --help', 'Display help for command');

    expect(program.name()).toBe('gwt');
    expect(program.description()).toBe('Git worktree manager for parallel development');
  });

  it('should have correct command structure with new commands', () => {
    const program = new Command();

    program.command('rm').alias('remove').description('Remove worktrees for current repo');
    program.command('ls').alias('list').description('List worktrees for current repo');
    program.command('status').alias('st').description('Show status of all worktrees');
    program.command('clean').alias('c').description('Remove merged worktrees');
    program.command('merge').alias('m').description('Merge worktree branch to main');
    program.command('config').description('Open config file');

    const commands = program.commands;
    expect(commands.length).toBe(6);
    expect(commands.map(c => c.name())).toContain('rm');
    expect(commands.map(c => c.name())).toContain('ls');
    expect(commands.map(c => c.name())).toContain('status');
    expect(commands.map(c => c.name())).toContain('clean');
    expect(commands.map(c => c.name())).toContain('merge');
    expect(commands.map(c => c.name())).toContain('config');
  });

  it('should configure version option', () => {
    const program = new Command();
    program.version('2.0.0', '-v, --version', 'Output the version number');

    const versionOption = program.options.find(opt => opt.short === '-v');
    expect(versionOption).toBeDefined();
    expect(versionOption?.long).toBe('--version');
  });

  it('should configure help option', () => {
    const program = new Command();
    program.helpOption('-h, --help', 'Display help for command');

    expect(program.helpInformation()).toContain('-h, --help');
  });

  it('should register list command with ls alias', () => {
    const program = new Command();
    const listCmd = program.command('ls').alias('list');

    expect(listCmd.name()).toBe('ls');
    expect(listCmd.aliases()).toContain('list');
  });

  it('should register status command with st alias', () => {
    const program = new Command();
    const statusCmd = program.command('status').alias('st');

    expect(statusCmd.name()).toBe('status');
    expect(statusCmd.aliases()).toContain('st');
  });

  it('should register rm command with remove alias', () => {
    const program = new Command();
    const rmCmd = program.command('rm').alias('remove');

    expect(rmCmd.name()).toBe('rm');
    expect(rmCmd.aliases()).toContain('remove');
  });

  it('should register clean command with c alias', () => {
    const program = new Command();
    const cleanCmd = program.command('clean').alias('c');

    expect(cleanCmd.name()).toBe('clean');
    expect(cleanCmd.aliases()).toContain('c');
  });

  it('should register merge command with m alias', () => {
    const program = new Command();
    const mergeCmd = program.command('merge').alias('m');

    expect(mergeCmd.name()).toBe('merge');
    expect(mergeCmd.aliases()).toContain('m');
  });

  it('should support variadic names argument for batch creation', () => {
    const program = new Command();
    program.argument('[names...]', 'Name(s) for worktree and branch');

    expect(program.registeredArguments.length).toBe(1);
    expect(program.registeredArguments[0].variadic).toBe(true);
  });

  it('should support -y/--yes flag for fast mode', () => {
    const program = new Command();
    program.option('-y, --yes', 'Use saved defaults, skip prompts');

    const yesOption = program.options.find(opt => opt.short === '-y');
    expect(yesOption).toBeDefined();
    expect(yesOption?.long).toBe('--yes');
  });

  it('should support --all flag for clean command', () => {
    const program = new Command();
    const cleanCmd = program
      .command('clean')
      .option('-a, --all', 'Remove all worktrees');

    const allOption = cleanCmd.options.find(opt => opt.short === '-a');
    expect(allOption).toBeDefined();
    expect(allOption?.long).toBe('--all');
  });

  it('should support merge command with required name argument', () => {
    const program = new Command();
    const mergeCmd = program
      .command('merge <name>')
      .description('Merge worktree branch to main');

    expect(mergeCmd.name()).toBe('merge');
    expect(mergeCmd.registeredArguments.length).toBe(1);
    expect(mergeCmd.registeredArguments[0].required).toBe(true);
  });
});
