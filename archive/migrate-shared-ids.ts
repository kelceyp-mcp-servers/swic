#!/usr/bin/env bun

/**
 * Migration script to convert shared cartridge IDs from crt### to scrt###
 *
 * This script:
 * 1. Backs up the current .index.json
 * 2. Scans ~/.swic/cartridges/ for the index file
 * 3. Converts all crt### IDs to scrt### format
 * 4. Writes the updated index back
 *
 * Usage:
 *   bun scripts/migrate-shared-ids.ts [--dry-run] [--backup-dir=PATH]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface MigrationOptions {
    dryRun: boolean;
    backupDir?: string;
}

interface IndexData {
    [id: string]: string;
}

const parseArgs = (): MigrationOptions => {
    const args = process.argv.slice(2);
    const options: MigrationOptions = {
        dryRun: args.includes('--dry-run')
    };

    const backupArg = args.find(arg => arg.startsWith('--backup-dir='));
    if (backupArg) {
        options.backupDir = backupArg.split('=')[1];
    }

    return options;
};

const migrateSharedCartridgeIds = async (options: MigrationOptions) => {
    const sharedDir = join(homedir(), '.swic', 'cartridges');
    const indexPath = join(sharedDir, '.index.json');

    console.log('SWIC Shared Cartridge ID Migration');
    console.log('===================================\n');

    // Check if shared directory exists
    if (!existsSync(sharedDir)) {
        console.log(`Shared cartridges directory not found: ${sharedDir}`);
        console.log('Nothing to migrate.');
        return;
    }

    // Check if index file exists
    if (!existsSync(indexPath)) {
        console.log(`No index file found at: ${indexPath}`);
        console.log('Nothing to migrate.');
        return;
    }

    // Read current index
    const indexContent = readFileSync(indexPath, 'utf-8');
    let index: IndexData;

    try {
        index = JSON.parse(indexContent);
    } catch (error) {
        console.error('Error parsing index file:', error);
        process.exit(1);
    }

    // Check if migration is needed
    const needsMigration = Object.keys(index).some(id => id.startsWith('crt'));

    if (!needsMigration) {
        console.log('Index already uses scrt### format. Nothing to migrate.');
        return;
    }

    // Create backup
    if (!options.dryRun) {
        const backupDir = options.backupDir || join(sharedDir, '.backups');
        if (!existsSync(backupDir)) {
            mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = join(backupDir, `.index-backup-${timestamp}.json`);

        copyFileSync(indexPath, backupPath);
        console.log(`✓ Created backup: ${backupPath}\n`);
    }

    // Perform migration
    const newIndex: IndexData = {};
    const migrations: Array<{ old: string; new: string; path: string }> = [];

    for (const [id, path] of Object.entries(index)) {
        if (id.startsWith('crt')) {
            // Convert crt### to scrt###
            const newId = `s${id}`;
            newIndex[newId] = path;
            migrations.push({ old: id, new: newId, path });
        } else {
            // Keep existing scrt### or other IDs
            newIndex[id] = path;
        }
    }

    // Display migration summary
    console.log(`Found ${Object.keys(index).length} total cartridges`);
    console.log(`Migrating ${migrations.length} IDs from crt### to scrt### format\n`);

    if (migrations.length > 0) {
        console.log('Migrations:');
        migrations.forEach(({ old, new: newId, path }) => {
            console.log(`  ${old} → ${newId}  (${path})`);
        });
        console.log('');
    }

    // Write new index (or show dry-run message)
    if (options.dryRun) {
        console.log('DRY RUN: No changes written.');
        console.log('Run without --dry-run to apply changes.');
    } else {
        writeFileSync(indexPath, JSON.stringify(newIndex, null, 2), 'utf-8');
        console.log(`✓ Updated index file: ${indexPath}`);
        console.log(`✓ Migration complete!`);
    }
};

// Main execution
const main = async () => {
    try {
        const options = parseArgs();

        if (options.dryRun) {
            console.log('Running in DRY RUN mode (no changes will be made)\n');
        }

        await migrateSharedCartridgeIds(options);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

main();
