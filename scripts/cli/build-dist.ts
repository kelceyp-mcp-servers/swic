#!/usr/bin/env bun

// Build the SWIC CLI to dist folder
//
// Usage: build-dist.ts [options]
//
// Builds the CLI to dist/ folder, minified with no source maps

// Handle description request
if (process.argv[2] === '--description') {
    console.log('Build SWIC CLI to dist folder');
    process.exit(0);
}

// Handle help request
if (process.argv[2] === '--help') {
    console.log('Build SWIC CLI to dist folder');
    console.log('');
    console.log('Usage: build-dist.ts [options]');
    console.log('');
    console.log('Builds the SWIC CLI to dist/ folder.');
    console.log('Output is minified with no source maps.');
    console.log('');
    console.log('Options:');
    console.log('  --help         Show this help message');
    console.log('  --description  Show brief description');
    console.log('  --usage        Show usage line');
    console.log('');
    console.log('Output:');
    console.log('  Creates dist/cli/cli.js');
    process.exit(0);
}

// Handle usage request
if (process.argv[2] === '--usage') {
    console.log('Usage: build-dist.ts [options]');
    process.exit(0);
}

import { spawn } from 'child_process';
import { join } from 'path';

/** Project root directory */
const projectRoot = join(import.meta.dir, '../..');

/**
 * Build the CLI with bun (for node runtime)
 * - Target: node runtime (so users don't need bun)
 * - Minified output
 * - No source maps
 */
console.log('Building CLI...');
const proc = spawn('bun', [
    'build',
    'src/cli/cli.ts',
    '--banner:js=#!/usr/bin/env node',
    '--outdir', 'dist/cli',
    '--target', 'node',
    '--minify',
    '--no-sourcemap'
], {
    cwd: projectRoot,
    stdio: 'inherit'
});

proc.on('close', (code) => {
    if (code === 0) {
        console.log('✅ CLI build completed successfully');
        console.log('   Output: dist/cli/cli.js');
    }
    else {
        console.log('❌ CLI build failed with code', code);
        process.exit(code || 1);
    }
});
