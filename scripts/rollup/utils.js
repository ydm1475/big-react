import path from 'path';
import fs from 'fs';

import ts from 'rollup-plugin-typescript2';
import cjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';

const pkgPath = path.resolve(__dirname, '../../packages');
const distPath = path.resolve(__dirname, '../../dist/node_modules');

export function resolvePkgPath(packName, isDist) {
	if (isDist) {
		return `${distPath}/${packName}`;
	}

	return `${pkgPath}/${packName}`;
}

export function getPackageJSON(packName) {
	const path = `${resolvePkgPath(packName)}/package.json`;
	const source = fs.readFileSync(path, { encoding: 'utf-8' });
	return JSON.parse(source);
}

export function getBaseRollupPlugins({
	alias = {
		__DEV__: true
	},
	tsConfig = {}
} = {}) {
	return [replace(alias), cjs(), ts(tsConfig)];
}
