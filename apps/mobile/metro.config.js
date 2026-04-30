// Metro config for pnpm monorepo
// Required so Metro can follow pnpm symlinks and find workspace packages.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the entire monorepo (needed for pnpm virtual store under node_modules/.pnpm)
config.watchFolders = [workspaceRoot];

// Both the app's own node_modules and the root pnpm virtual store
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Follow pnpm symlinks to their real path in the .pnpm store
config.resolver.unstable_enableSymlinks = true;

// Needed for some ESM-aware packages in the pnpm store
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
