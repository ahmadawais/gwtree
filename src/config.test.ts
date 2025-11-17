import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {getConfig, setConfig, resetConfig, config} from './config.js';

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
				defaultBranchChoice: 'current',
				defaultSuffix: '1',
				defaultOpenEditor: true,
				defaultEditor: 'code',
				namePattern: '{repo}-{branch}-wt-{suffix}',
			});
		});

		it('should return updated configuration after setConfig', () => {
			setConfig('defaultSuffix', 'test');
			const cfg = getConfig();
			expect(cfg.defaultSuffix).toBe('test');
		});
	});

	describe('setConfig', () => {
		it('should update defaultBranchChoice', () => {
			setConfig('defaultBranchChoice', 'new');
			expect(getConfig().defaultBranchChoice).toBe('new');
		});

		it('should update defaultSuffix', () => {
			setConfig('defaultSuffix', 'custom');
			expect(getConfig().defaultSuffix).toBe('custom');
		});

		it('should update defaultOpenEditor', () => {
			setConfig('defaultOpenEditor', false);
			expect(getConfig().defaultOpenEditor).toBe(false);
		});

		it('should update defaultEditor', () => {
			setConfig('defaultEditor', 'default');
			expect(getConfig().defaultEditor).toBe('default');
		});

		it('should update namePattern', () => {
			setConfig('namePattern', '{repo}-{suffix}');
			expect(getConfig().namePattern).toBe('{repo}-{suffix}');
		});
	});

	describe('resetConfig', () => {
		it('should reset configuration to defaults', () => {
			setConfig('defaultSuffix', 'modified');
			setConfig('defaultEditor', 'none');
			resetConfig();
			const cfg = getConfig();
			expect(cfg.defaultSuffix).toBe('1');
			expect(cfg.defaultEditor).toBe('code');
		});

		it('should clear all custom values', () => {
			setConfig('defaultBranchChoice', 'new');
			setConfig('namePattern', 'custom-pattern');
			resetConfig();
			const cfg = getConfig();
			expect(cfg.defaultBranchChoice).toBe('current');
			expect(cfg.namePattern).toBe('{repo}-{branch}-wt-{suffix}');
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
			config.set('defaultSuffix', 'persistent');
			expect(config.get('defaultSuffix')).toBe('persistent');
		});
	});
});
