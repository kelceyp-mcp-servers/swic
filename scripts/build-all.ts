#!/usr/bin/env bun

// Build all SWIC components (server + CLI) to dist folder
//
// Usage: build-all.ts [options]
//
// Builds both server and CLI, validates outputs, and reports bundle sizes

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
    process.exit(0);
}

// Handle usage request
if (process.argv[2] === '--usage') {
    console.log('Usage: build-all.ts [options]');
    process.exit(0);
}

import { spawn } from 'child_process';
import { statSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/** Project root directory */
const projectRoot = join(import.meta.dir, '..');

/**
 * Run a command and wait for completion
 */
function runCommand(command: string, args: string[]): Promise<number> {
    return new Promise((resolve) => {
        const proc = spawn(command, args, {
            cwd: projectRoot,
            stdio: 'inherit'
        });
        proc.on('close', (code) => resolve(code || 0));
    });
}

/**
 * Get file size in KB
 */
function getFileSizeKB(filePath: string): string {
    try {
        const stats = statSync(filePath);
        return `${(stats.size / 1024).toFixed(1)} KB`;
    }
    catch {
        return 'not found';
    }
}

/**
 * Fix shebang in a file - replace first line with #!/usr/bin/env node
 */
function fixShebang(filePath: string): void {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Replace first line with correct shebang
    lines[0] = '#!/usr/bin/env node';

    writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

/**
 * Main build process
 */
async function buildAll() {
    console.log('🔨 Building SWIC distribution...\n');

    // Clean dist directory
    console.log('Cleaning dist directory...');
    rmSync(join(projectRoot, 'dist'), { recursive: true, force: true });
    console.log('');

    // Build server
    console.log('Building server...');
    // const serverCode = await runCommand('bun', [
    //     'build',
    //     'src/server/Server.ts',
    //     '--banner:js=#!/usr/bin/env node',
    //     '--outdir', 'dist/server',
    //     '--target', 'bun',
    //     '--minify',
    //     '--no-sourcemap'
    // ]);

    const serverCode = await runCommand('bun', [
        'build',
        'src/server/Server.ts',
        '--banner:js=#!/usr/bin/env node',
        '--outdir', 'dist/server',
        '--target', 'node',
        '--minify',
        '--no-sourcemap'
    ]);


    if (serverCode !== 0) {
        console.log('❌ Server build failed');
        process.exit(serverCode);
    }
    console.log('');

    // Build CLI
    console.log('Building CLI...');
    const cliCode = await runCommand('bun', [
        'build',
        'src/cli/cli.ts',
        '--banner:js=#!/usr/bin/env node',
        '--outdir', 'dist/cli',
        '--target', 'node',
        '--minify',
        '--no-sourcemap'
    ]);

    if (cliCode !== 0) {
        console.log('❌ CLI build failed');
        process.exit(cliCode);
    }
    console.log('');

    // Fix shebangs (bun auto-generates incorrect ones)
    console.log('Fixing shebangs...');
    const serverPath = join(projectRoot, 'dist/server/Server.js');
    const cliPath = join(projectRoot, 'dist/cli/cli.js');

    fixShebang(serverPath);
    fixShebang(cliPath);
    console.log('');

    // Validate and report

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
}

buildAll().catch((error) => {
    console.error('❌ Build failed:', error);
    process.exit(1);
});
