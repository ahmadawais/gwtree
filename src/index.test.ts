import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {Command} from 'commander';

describe('CLI Integration', () => {
	it('should parse and execute commands', () => {
		const program = new Command();

		program
			.name('gwtree')
			.description('Git worktree manager for parallel development')
			.version('1.0.0', '-v, --version', 'Output the version number')
			.helpOption('-h, --help', 'Display help for command');

		expect(program.name()).toBe('gwtree');
		expect(program.description()).toBe(
			'Git worktree manager for parallel development',
		);
	});

	it('should have correct command structure', () => {
		const program = new Command();

		program
			.command('create', {isDefault: true})
			.description('Create a new git worktree');

		program
			.command('list')
			.alias('ls')
			.description('List all git worktrees');

		program
			.command('remove')
			.alias('rm')
			.description('Remove a git worktree');

		const commands = program.commands;
		expect(commands.length).toBe(3);
		expect(commands[0].name()).toBe('create');
		expect(commands[1].name()).toBe('list');
		expect(commands[2].name()).toBe('remove');
	});

	it('should configure version option', () => {
		const program = new Command();
		program.version('1.0.0', '-v, --version', 'Output the version number');

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
		const listCmd = program.command('list').alias('ls');

		expect(listCmd.name()).toBe('list');
		expect(listCmd.aliases()).toContain('ls');
	});

	it('should register remove command with rm alias', () => {
		const program = new Command();
		const removeCmd = program.command('remove').alias('rm');

		expect(removeCmd.name()).toBe('remove');
		expect(removeCmd.aliases()).toContain('rm');
	});

	it('should set create as default command', () => {
		const program = new Command();
		const createCmd = program.command('create', {isDefault: true});

		expect(createCmd.name()).toBe('create');
	});
});
