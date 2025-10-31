import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';
import CartridgeAddressResolver from '../../../core/utils/CartridgeAddressResolver.js';
import * as readline from 'readline';

/**
 * Prompt user for confirmation using readline
 */
const confirmPrompt = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(`${message} [y/N] `, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
};

/**
 * Creates the 'delete' command for the cartridge CLI group.
 * Deletes one or more cartridges from the working copy using optimistic locking.
 * Accepts comma-separated identifiers (e.g., "crt001,crt002,crt003").
 * Scope is optional - checks project first, then shared (or inferred from ID).
 * Prompts for confirmation unless --confirm flag is provided.
 *
 * @param services - Core services including cartridgeService
 * @returns Built CLI command
 */
const create = (services: CoreServices) => {
    return createCommand('delete')
        .summary('Delete cartridge(s) - comma-separated (auto-resolves scope, requires confirmation)')
        .param((p) => p
            .name('identifier')
            .type('string')
            .positional(0)
            .required()
        )
        .param((p) => p
            .name('scope')
            .type('string')
            .flag('scope', 's')
            .validate((value) => {
                if (value && value !== 'project' && value !== 'shared') {
                    return 'Scope must be "project" or "shared"';
                }
                return true;
            })
        )
        .param((p) => p
            .name('hash')
            .type('string')
            .flag('hash', 'h')
        )
        .param((p) => p
            .name('confirm')
            .type('boolean')
            .flag('confirm', 'y')
        )
        .run(async (ctx) => {
            const { identifier, scope, hash, confirm } = ctx.params;

            // Parse comma-separated identifiers and deduplicate
            const identifiers = identifier.includes(',')
                ? [...new Set(identifier.split(',').map(id => id.trim()).filter(Boolean))]
                : [identifier];

            // Handle empty result after parsing
            if (identifiers.length === 0) {
                throw new Error('No identifiers provided');
            }

            const isSingleDelete = identifiers.length === 1;

            // Validation phase: fail fast on invalid identifiers
            for (const id of identifiers) {
                // Basic format check - allow both IDs and paths
                if (!id || id.length === 0) {
                    throw new Error(`Invalid identifier: empty string`);
                }
            }

            // Read phase: read all cartridges in parallel (fail fast on error)
            const cartridges = await Promise.all(
                identifiers.map(async (id) => {
                    const isId = CartridgeAddressResolver.isCartridgeId(id);
                    return await services.cartridgeService.read(
                        isId
                            ? { kind: 'id', scope: scope as 'project' | 'shared' | undefined, id }
                            : { kind: 'path', scope: scope as 'project' | 'shared' | undefined, path: id }
                    );
                })
            );

            // Confirmation phase
            if (!confirm) {
                if (isSingleDelete) {
                    // Backward compatible single-delete UX
                    const cartridge = cartridges[0];
                    const resolvedScope = cartridge.id.startsWith('scrt') ? 'shared' : 'project';
                    const response = await confirmPrompt(
                        `Delete ${resolvedScope} cartridge '${cartridge.path}' (${cartridge.id})?`
                    );

                    if (!response) {
                        ctx.logger.info('Deletion cancelled');
                        return;
                    }
                } else {
                    // Bulk delete UX with formatted list
                    console.log(`\nCartridges to delete (${cartridges.length}):\n`);

                    for (const cartridge of cartridges) {
                        const resolvedScope = cartridge.id.startsWith('scrt') ? 'shared' : 'project';
                        console.log(`  ${resolvedScope.padEnd(8)} ${cartridge.path.padEnd(40)} (${cartridge.id})`);
                    }

                    const response = await confirmPrompt(
                        `\nDelete ${cartridges.length} cartridge${cartridges.length > 1 ? 's' : ''}?`
                    );

                    if (!response) {
                        ctx.logger.info('Deletion cancelled');
                        return;
                    }
                }
            }

            // Delete phase: delete all cartridges sequentially
            const results: Array<{ id: string; deleted: boolean }> = [];

            for (const cartridge of cartridges) {
                const id = identifiers[cartridges.indexOf(cartridge)];
                const isId = CartridgeAddressResolver.isCartridgeId(id);
                const expectedHash = hash || cartridge.hash;

                const result = await services.cartridgeService.deleteLatest(
                    (isId
                        ? { kind: 'id', scope: scope as 'project' | 'shared' | undefined, id }
                        : { kind: 'path', scope: scope as 'project' | 'shared' | undefined, path: id }) as any,
                    expectedHash
                );

                results.push({ id: cartridge.id, deleted: result.deleted });
            }

            // Report phase: output results and summary
            const deletedResults = results.filter(r => r.deleted);
            const alreadyDeletedCount = results.length - deletedResults.length;

            if (deletedResults.length > 0) {
                ctx.stdio.stdout.write(deletedResults.map(r => r.id).join('\n') + '\n');
            }

            if (isSingleDelete) {
                // Backward compatible single-delete messaging
                const cartridge = cartridges[0];
                const resolvedScope = cartridge.id.startsWith('scrt') ? 'shared' : 'project';
                if (deletedResults.length > 0) {
                    ctx.logger.info(`Deleted ${resolvedScope} cartridge: ${cartridge.id} at ${cartridge.path}`);
                } else {
                    ctx.logger.info(`Cartridge at ${cartridge.path} was already deleted`);
                }
            } else {
                // Bulk delete summary
                if (deletedResults.length > 0) {
                    ctx.logger.info(`Deleted ${deletedResults.length} cartridge${deletedResults.length > 1 ? 's' : ''}`);
                }
                if (alreadyDeletedCount > 0) {
                    ctx.logger.info(`${alreadyDeletedCount} cartridge${alreadyDeletedCount > 1 ? 's were' : ' was'} already deleted`);
                }
            }
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ create });
