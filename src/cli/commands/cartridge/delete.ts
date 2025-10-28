import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';
import AddressResolver from '../../../core/utils/AddressResolver.js';

const addressResolver = AddressResolver.create({
    idPattern: /^crt\d{3,}$/,
    entityName: 'cartridge'
});

/**
 * Creates the 'delete' command for the cartridge CLI group.
 * Deletes a cartridge from the working copy using optimistic locking.
 *
 * @param services - Core services including cartridgeService
 * @returns Built CLI command
 */
const create = (services: CoreServices) => {
    return createCommand('delete')
        .summary('Delete a cartridge')
        .param((p) => p
            .name('scope')
            .type('string')
            .positional(0)
            .required()
            .validate((value) => {
                if (value !== 'project' && value !== 'shared') {
                    return 'Scope must be "project" or "shared"';
                }
                return true;
            })
        )
        .param((p) => p
            .name('identifier')
            .type('string')
            .positional(1)
            .required()
        )
        .param((p) => p
            .name('hash')
            .type('string')
            .flag('hash', 'h')
        )
        .run(async (ctx) => {
            const { scope, identifier, hash } = ctx.params;

            // Auto-detect if identifier is an ID or path
            const resolved = addressResolver.resolve(identifier);

            // Read cartridge to get ID and hash (need ID for output, hash if not provided)
            const cartridge = await services.cartridgeService.read(
                resolved.kind === 'id'
                    ? { kind: 'id', scope: scope as 'project' | 'shared', id: resolved.value }
                    : { kind: 'path', scope: scope as 'project' | 'shared', path: resolved.value }
            );

            const expectedHash = hash || cartridge.hash;
            const cartridgeId = cartridge.id;

            const result = await services.cartridgeService.deleteLatest(
                resolved.kind === 'id'
                    ? { kind: 'id', scope: scope as 'project' | 'shared', id: resolved.value }
                    : { kind: 'path', scope: scope as 'project' | 'shared', path: resolved.value },
                expectedHash
            );

            if (result.deleted) {
                ctx.stdio.stdout.write(`${cartridgeId}\n`);
                ctx.logger.info(`Deleted cartridge: ${cartridgeId} at ${cartridge.path}`);
            }
            else {
                ctx.logger.info(`Cartridge at ${cartridge.path} was already deleted`);
            }
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ create });
