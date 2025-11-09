#!/usr/bin/env bun

/**
 * Build all SWIC components (server + CLI) and generate npm bin launcher.
 * - Server: Bun runtime bundle with Bun shebang
 * - CLI:    Node runtime bundle with Node shebang
 * - Bin:    Node wrapper that invokes the Bun-built server
 */

// Handle description request
if (process.argv[2] === '--description') {
    console.log('Build all SWIC components to dist folder');
    process.exit(0);
}

// Handle help request
if (process.argv[2] === '--help') {
    console.log('Build all SWIC components to dist folder');
    console.log('');
    console.log('Usage: build-all.ts [options]');
    console.log('');
    console.log('Builds both server and CLI to dist/ folder.');
    console.log('Validates outputs and reports bundle sizes.');
    console.log('');
    console.log('Options:');
    console.log('  --help         Show this help message');
    console.log('  --description  Show brief description');
    console.log('  --usage        Show usage line');
    console.log('');
    console.log('Output:');
    console.log('  Creates dist/server/Server.js');
    console.log('  Creates dist/cli/cli.js');
    console.log('  Creates bin/swic-mcp.js');
    process.exit(0);
}

// Handle usage request
if (process.argv[2] === '--usage') {
    console.log('Usage: build-all.ts [options]');
    process.exit(0);
}

import { spawn } from 'child_process';
import {
    statSync,
    rmSync,
    readFileSync,
    writeFileSync,
    chmodSync,
    mkdirSync,
    copyFileSync,
} from 'fs';
import { join } from 'path';

/** Project root (scripts/.. = repo root) */
const projectRoot = join(import.meta.dir, '..');

/** Run a command and resolve with exit code (0 if success) */
function runCommand(command: string, args: string[]): Promise<number> {
    return new Promise((resolve) => {
        const proc = spawn(command, args, {
            cwd: projectRoot,
            stdio: 'inherit',
        });
        proc.on('close', (code) => resolve(code ?? 0));
    });
}

/** Human-readable file size (KB) */
function getFileSizeKB(filePath: string): string {
    try {
        const stats = statSync(filePath);
        return `${(stats.size / 1024).toFixed(1)} KB`;
    } catch {
        return 'not found';
    }
}

/** Force Node shebang on a file */
function fixShebangToNode(filePath: string): void {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    lines[0] = '#!/usr/bin/env node';
    writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

/** Force Bun shebang on a file */
function fixShebangToBun(filePath: string): void {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    lines[0] = '#!/usr/bin/env bun';
    writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

async function buildAll() {
    console.log('🔨 Building SWIC distribution...\n');

    // Clean dist
    console.log('Cleaning dist directory...');
    rmSync(join(projectRoot, 'dist'), { recursive: true, force: true });
    console.log('');

    // Build SERVER (Bun runtime + Bun shebang)
    console.log('Building server...');
    const serverCode = await runCommand('bun', [
        'build',
        'src/server/Server.ts',
        '--banner:js=#!/usr/bin/env bun',
        '--outdir',
        'dist/server',
        '--target',
        'bun',
        '--minify',
        '--no-sourcemap',
    ]);
    if (serverCode !== 0) {
        console.log('❌ Server build failed');
        process.exit(serverCode);
    }
    console.log('');

    // Build CLI (Node runtime + Node shebang)
    console.log('Building CLI...');
    const cliCode = await runCommand('bun', [
        'build',
        'src/cli/cli.ts',
        '--banner:js=#!/usr/bin/env node',
        '--outdir',
        'dist/cli',
        '--target',
        'node',
        '--minify',
        '--no-sourcemap',
    ]);
    if (cliCode !== 0) {
        console.log('❌ CLI build failed');
        process.exit(cliCode);
    }
    console.log('');

    // Create Node launcher bin that delegates to Bun-built server
    console.log('Creating Node launcher for swic-mcp...');
    const binDir = join(projectRoot, 'bin');
    mkdirSync(binDir, { recursive: true });

    // Copy source launcher (ESM, no TS types) to bin/ as JS
    const srcLauncher = join(projectRoot, 'src/bin/swic-mcp.ts');
    const outLauncher = join(binDir, 'swic-mcp.js');
    copyFileSync(srcLauncher, outLauncher);
    try {
        chmodSync(outLauncher, 0o755);
    } catch {}
    console.log('✅ Node launcher created\n');

    // Fix shebangs on built artifacts and ensure executability
    console.log('Fixing shebangs...');
    const serverPath = join(projectRoot, 'dist/server/Server.js');
    const cliPath = join(projectRoot, 'dist/cli/cli.js');

    fixShebangToBun(serverPath); // server runs with Bun
    fixShebangToNode(cliPath); // CLI runs with Node

    try {
        chmodSync(serverPath, 0o755);
    } catch {}
    try {
        chmodSync(cliPath, 0o755);
    } catch {}
    console.log('');

    // Report bundle sizes
    const serverSize = getFileSizeKB(serverPath);
    const cliSize = getFileSizeKB(cliPath);

    console.log('✅ Build completed successfully\n');
    console.log('📦 Bundle sizes:');
    console.log(`   Server: ${serverSize}`);
    console.log(`   CLI:    ${cliSize}`);
    console.log('');
    console.log('📂 Output:');
    console.log('   dist/server/Server.js');
    console.log('   dist/cli/cli.js');
    console.log('   bin/swic-mcp.js');
}

buildAll().catch((error) => {
    console.error('❌ Build failed:', error);
    process.exit(1);
});
