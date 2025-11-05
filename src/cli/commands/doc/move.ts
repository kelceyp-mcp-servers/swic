import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';
import docAddressResolver from '../../../core/utils/DocAddressResolver.js';
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
 * Creates the 'move' command for the doc CLI group.
 * Moves/renames a doc by creating at destination and deleting source.
 * Works for both same-scope and cross-scope moves.
 * Always generates a new ID (even for same-scope moves).
 * Prompts for confirmation unless --confirm flag is provided.
 *
 * @param services - Core services including docService
 * @returns Built CLI command
 */
const create = (services: CoreServices) => {
    return createCommand('move')
        .summary('Move/rename a doc to a new path (generates new ID)')
        .param((p) => p
            .name('source')
            .type('string')
            .positional(0)
            .required()
            .prompt('Source doc (ID or path):')
        )
        .param((p) => p
            .name('destination')
            .type('string')
            .positional(1)
            .required()
            .prompt('Destination path:')
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
            .name('toScope')
            .type('string')
            .flag('to-scope', 't')
            .validate((value) => {
                if (value && value !== 'project' && value !== 'shared') {
                    return 'To-scope must be "project" or "shared"';
                }
                return true;
            })
            .prompt({
                message: 'Destination scope (leave blank for same scope):',
                type: 'select',
                choices: ['', 'project', 'shared']
            })
        )
        .param((p) => p
            .name('confirm')
            .type('boolean')
            .flag('confirm', 'y')
        )
        .run(async (ctx) => {
            const { source, destination, scope, toScope, confirm } = ctx.params;

            // 1. Read source doc
            const isId = docAddressResolver.isdocId(source);
            const sourceCart = await services.DocService.read(
                isId
                    ? { kind: 'id', scope: scope as 'project' | 'shared' | undefined, id: source }
                    : { kind: 'path', scope: scope as 'project' | 'shared' | undefined, path: source }
            );

            // 2. Determine destination scope
            const sourceScope = sourceCart.id.startsWith('sdoc') ? 'shared' : 'project';
            const destScope = (toScope as 'project' | 'shared' | undefined) || sourceScope;
            const isCrossScope = sourceScope !== destScope;

            // 3. Check if moving to same location
            if (sourceCart.path === destination && sourceScope === destScope) {
                throw new Error('Source and destination are identical');
            }

            // 4. Check if destination exists
            try {
                await services.DocService.read({
                    kind: 'path',
                    scope: destScope,
                    path: destination
                });
                // If read succeeds, destination exists
                throw new Error(`Destination already exists: ${destScope} ${destination}`);
            }
            catch (err: any) {
                // Expected: destination doesn't exist
                // Can be either "No doc" or "File or directory not found"
                const isNotFound = err.message.includes('No doc') ||
                                   err.message.includes('not found') ||
                                   err.message.includes('File or directory');
                if (!isNotFound) {
                    throw err; // Unexpected error
                }
                // Otherwise, destination doesn't exist - this is good, continue
            }

            // 5. Confirmation prompt (unless --confirm)
            if (!confirm) {
                if (isCrossScope) {
                    console.log('Moving doc across scopes:');
                    console.log(`  From: ${sourceScope.padEnd(8)} ${sourceCart.path} (${sourceCart.id})`);
                    console.log(`  To:   ${destScope.padEnd(8)} ${destination} (new ID will be assigned)\n`);
                    console.log('Note: Cross-scope move will generate a new ID.');
                }
                else {
                    console.log('Moving doc:');
                    console.log(`  From: ${sourceScope} ${sourceCart.path} (${sourceCart.id})`);
                    console.log(`  To:   ${destScope} ${destination}`);
                }

                const response = await confirmPrompt('\nMove doc?');
                if (!response) {
                    ctx.logger.info('Move cancelled');
                    return;
                }
            }

            // 6. Create at destination
            const newCart = await services.DocService.create({
                address: {
                    kind: 'path',
                    path: destination,
                    scope: destScope
                },
                content: sourceCart.content
            });

            // 7. Delete source
            const deleteAddress = isId
                ? { kind: 'id' as const, id: source }
                : { kind: 'path' as const, path: source };
            await services.DocService.deleteLatest(
                deleteAddress,
                sourceCart.hash
            );

            // 8. Report results
            ctx.stdio.stdout.write(`${newCart.id}\n`);
            ctx.logger.info(`Moved ${sourceCart.id} from ${sourceCart.path} to ${destination} (new ID: ${newCart.id})`);
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ create });
