import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';
import docAddressResolver from '../../../core/utils/docAddressResolver.js';
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
 * Creates the 'delete' command for the doc CLI group.
 * Deletes one or more docs from the working copy using optimistic locking.
 * Accepts comma-separated identifiers (e.g., "doc001,doc002,doc003").
 * Scope is optional - checks project first, then shared (or inferred from ID).
 * Prompts for confirmation unless --confirm flag is provided.
 *
 * @param services - Core services including docService
 * @returns Built CLI command
 */
const create = (services: CoreServices) => {
    return createCommand('delete')
        .summary('Delete doc(s) - comma-separated (auto-resolves scope, requires confirmation)')
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
                    throw new Error('Invalid identifier: empty string');
                }
            }

            // Read phase: read all docs in parallel (fail fast on error)
            const docs = await Promise.all(
                identifiers.map(async (id) => {
                    const isId = docAddressResolver.isdocId(id);
                    return await services.DocService.read(
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
                    const doc = docs[0];
                    const resolvedScope = doc.id.startsWith('sdoc') ? 'shared' : 'project';
                    const response = await confirmPrompt(
                        `Delete ${resolvedScope} doc '${doc.path}' (${doc.id})?`
                    );

                    if (!response) {
                        ctx.logger.info('Deletion cancelled');
                        return;
                    }
                }
                else {
                    // Bulk delete UX with formatted list
                    console.log(`\ndocs to delete (${docs.length}):\n`);

                    for (const doc of docs) {
                        const resolvedScope = doc.id.startsWith('sdoc') ? 'shared' : 'project';
                        console.log(`  ${resolvedScope.padEnd(8)} ${doc.path.padEnd(40)} (${doc.id})`);
                    }

                    const response = await confirmPrompt(
                        `\nDelete ${docs.length} doc${docs.length > 1 ? 's' : ''}?`
                    );

                    if (!response) {
                        ctx.logger.info('Deletion cancelled');
                        return;
                    }
                }
            }

            // Delete phase: delete all docs sequentially
            const results: Array<{ id: string; deleted: boolean }> = [];

            for (const doc of docs) {
                const id = identifiers[docs.indexOf(doc)];
                const isId = docAddressResolver.isdocId(id);
                const expectedHash = hash || doc.hash;

                const result = await services.DocService.deleteLatest(
                    (isId
                        ? { kind: 'id', scope: scope as 'project' | 'shared' | undefined, id }
                        : { kind: 'path', scope: scope as 'project' | 'shared' | undefined, path: id }) as any,
                    expectedHash
                );

                results.push({ id: doc.id, deleted: result.deleted });
            }

            // Report phase: output results and summary
            const deletedResults = results.filter(r => r.deleted);
            const alreadyDeletedCount = results.length - deletedResults.length;

            if (deletedResults.length > 0) {
                ctx.stdio.stdout.write(deletedResults.map(r => r.id).join('\n') + '\n');
            }

            if (isSingleDelete) {
                // Backward compatible single-delete messaging
                const doc = docs[0];
                const resolvedScope = doc.id.startsWith('sdoc') ? 'shared' : 'project';
                if (deletedResults.length > 0) {
                    ctx.logger.info(`Deleted ${resolvedScope} doc: ${doc.id} at ${doc.path}`);
                }
                else {
                    ctx.logger.info(`doc at ${doc.path} was already deleted`);
                }
            }
            else {
                // Bulk delete summary
                if (deletedResults.length > 0) {
                    ctx.logger.info(`Deleted ${deletedResults.length} doc${deletedResults.length > 1 ? 's' : ''}`);
                }
                if (alreadyDeletedCount > 0) {
                    ctx.logger.info(`${alreadyDeletedCount} doc${alreadyDeletedCount > 1 ? 's were' : ' was'} already deleted`);
                }
            }
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ create });
