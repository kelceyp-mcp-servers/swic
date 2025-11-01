#!/usr/bin/env bun

/**
 * Initialize shared docs index from existing files
 *
 * This script:
 * 1. Scans ~/.swic/docs/ recursively for all files
 * 2. Generates sdoc### IDs for each file
 * 3. Creates .index.json with ID → path mappings
 * 4. Backs up existing index if present
 *
 * Usage:
 *   bun scripts/initialize-shared-index.ts [--dry-run]
 */

import { readdirSync, existsSync, mkdirSync, copyFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { homedir } from 'os';

interface InitializeOptions {
    dryRun: boolean;
}

interface IndexData {
    [id: string]: string;
}

const parseArgs = (): InitializeOptions => {
    const args = process.argv.slice(2);
    return {
        dryRun: args.includes('--dry-run')
    };
};

/**
 * Recursively find all files in a directory
 * Excludes: .index.json, .backups/, hidden files (starting with .)
 */
const findAllFiles = (dir: string, baseDir: string): string[] => {
    const results: string[] = [];

    try {
        const entries = readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            const relativePath = relative(baseDir, fullPath);

            // Skip hidden files and directories (starting with .)
            if (entry.name.startsWith('.')) {
                continue;
            }

            if (entry.isDirectory()) {
                // Recurse into subdirectories
                results.push(...findAllFiles(fullPath, baseDir));
            }
            else if (entry.isFile()) {
                // Add file with relative path from base directory
                results.push(relativePath);
            }
        }
    }
    catch (error: any) {
        console.error(`Error reading directory ${dir}:`, error.message);
    }

    return results;
};

const initializeSharedIndex = async (options: InitializeOptions) => {
    const sharedDir = join(homedir(), '.swic', 'docs');
    const indexPath = join(sharedDir, '.index.json');

    console.log('SWIC Shared docs Index Initialization');
    console.log('===========================================\n');

    // Check if shared directory exists
    if (!existsSync(sharedDir)) {
        console.log(`Shared docs directory not found: ${sharedDir}`);
        console.log('Creating directory...');
        if (!options.dryRun) {
            mkdirSync(sharedDir, { recursive: true });
        }
        console.log('Directory created. No files to index.');
        return;
    }

    // Scan for files
    console.log(`Scanning: ${sharedDir}\n`);
    const files = findAllFiles(sharedDir, sharedDir);

    if (files.length === 0) {
        console.log('No files found to index.');
        return;
    }

    console.log(`Found ${files.length} files:\n`);

    // Generate index
    const index: IndexData = {};
    const mappings: Array<{ id: string; path: string }> = [];

    files.sort(); // Sort for consistent ID assignment

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const id = `sdoc${(i + 1).toString().padStart(3, '0')}`;

        // Store paths exactly as they exist on disk (with extensions)
        index[id] = file;
        mappings.push({ id, path: file });
    }

    // Display mappings
    console.log('Generated mappings:');
    mappings.forEach(({ id, path }) => {
        console.log(`  ${id} → ${path}`);
    });
    console.log('');

    // Check if index already exists
    if (existsSync(indexPath)) {
        console.log('⚠️  Warning: Index file already exists!');

        if (!options.dryRun) {
            // Create backup
            const backupDir = join(sharedDir, '.backups');
            if (!existsSync(backupDir)) {
                mkdirSync(backupDir, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = join(backupDir, `.index-backup-${timestamp}.json`);

            copyFileSync(indexPath, backupPath);
            console.log(`✓ Created backup: ${backupPath}\n`);
        }
    }

    // Write index (or show dry-run message)
    if (options.dryRun) {
        console.log('DRY RUN: No changes written.');
        console.log('Run without --dry-run to create the index.');
    }
    else {
        writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
        console.log(`✓ Created index: ${indexPath}`);
        console.log(`✓ Indexed ${files.length} docs with sdoc### IDs`);
        console.log('\nNext steps:');
        console.log('  1. Run: swic doc list');
        console.log('  2. Verify all docs are listed');
        console.log('  3. Try reading a doc by path or ID');
    }
};

// Main execution
const main = async () => {
    try {
        const options = parseArgs();

        if (options.dryRun) {
            console.log('Running in DRY RUN mode (no changes will be made)\n');
        }

        await initializeSharedIndex(options);
    }
    catch (error) {
        console.error('Initialization failed:', error);
        process.exit(1);
    }
};

main();
