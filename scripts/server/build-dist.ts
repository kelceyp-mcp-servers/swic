#!/usr/bin/env bun

// Build the SWIC server to dist folder
//
// Usage: build-dist.ts [options]
//
// Builds the server to dist/ folder, minified with no source maps

// Handle description request
if (process.argv[2] === '--description') {
    console.log('Build SWIC server to dist folder');
    process.exit(0);
}

// Handle help request
if (process.argv[2] === '--help') {
    console.log('Build SWIC server to dist folder');
    console.log('');
    console.log('Usage: build-dist.ts [options]');
    console.log('');
    console.log('Builds the SWIC MCP server to dist/ folder.');
    console.log('Output is minified with no source maps.');
    console.log('');
    console.log('Options:');
    console.log('  --help         Show this help message');
    console.log('  --description  Show brief description');
    console.log('  --usage        Show usage line');
    console.log('');
    console.log('Output:');
    console.log('  Creates dist/server/Server.js');
    process.exit(0);
}

// Handle usage request
if (process.argv[2] === '--usage') {
    console.log('Usage: build-dist.ts [options]');
    process.exit(0);
}

import { spawn } from 'child_process';
import { rmSync } from 'fs';
import { join } from 'path';

/** Project root directory */
const projectRoot = join(import.meta.dir, '../..');

/**
 * Clean the dist directory
 */
console.log('Cleaning dist directory...');
rmSync(join(projectRoot, 'dist'), { recursive: true, force: true });

/**
 * Build the server with bun
 * - Target: bun runtime
 * - Minified output
 * - No source maps
 */
console.log('Building server...');
const proc = spawn('bun', [
    'build',
    'src/server/Server.ts',
    '--outdir', 'dist/server',
    '--target', 'bun',
    '--minify',
    '--no-sourcemap'
], {
    cwd: projectRoot,
    stdio: 'inherit'
});

proc.on('close', (code) => {
    if (code === 0) {
        console.log('✅ Build completed successfully');
        console.log('   Output: dist/server/Server.js');
    } else {
        console.log('❌ Build failed with code', code);
        process.exit(code || 1);
    }
});