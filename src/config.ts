import Conf from 'conf';

export interface GWTreeConfig {
	defaultBranchChoice: 'current' | 'new';
	defaultSuffix: string;
	defaultOpenEditor: boolean;
	defaultEditor: 'code' | 'default' | 'none';
	namePattern: string;
	showRemoteBranches: boolean;
}

const schema = {
	defaultBranchChoice: {
		type: 'string',
		enum: ['current', 'new'],
		default: 'current',
	},
	defaultSuffix: {
		type: 'string',
		default: '1',
	},
	defaultOpenEditor: {
		type: 'boolean',
		default: true,
	},
	defaultEditor: {
		type: 'string',
		enum: ['code', 'default', 'none'],
		default: 'code',
	},
	namePattern: {
		type: 'string',
		default: '{repo}-{branch}-wt-{suffix}',
	},
	showRemoteBranches: {
		type: 'boolean',
		default: true,
	},
} as const;

export const config = new Conf<GWTreeConfig>({
	projectName: 'gwtree',
	schema,
});

export function getConfig(): GWTreeConfig {
	return {
		defaultBranchChoice: config.get('defaultBranchChoice'),
		defaultSuffix: config.get('defaultSuffix'),
		defaultOpenEditor: config.get('defaultOpenEditor'),
		defaultEditor: config.get('defaultEditor'),
		namePattern: config.get('namePattern'),
		showRemoteBranches: config.get('showRemoteBranches'),
	};
}

export function setConfig(key: keyof GWTreeConfig, value: any): void {
	config.set(key, value);
}

export function resetConfig(): void {
	config.clear();
}
