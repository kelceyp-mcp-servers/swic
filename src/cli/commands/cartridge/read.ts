import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';
import AddressResolver from '../../../core/utils/AddressResolver.js';

const addressResolver = AddressResolver.create({
    idPattern: /^crt\d{3,}$/,
    entityName: 'cartridge'
});

/**
 * Creates the 'read' command for the cartridge CLI group.
 * Reads and outputs a cartridge's content.
 *
 * @param services - Core services including cartridgeService
 * @returns Built CLI command
 */
const create = (services: CoreServices) => {
    return createCommand('read')
        .summary('Read a cartridge')
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
            .name('meta')
            .type('boolean')
            .flag('meta', 'm')
        )
        .run(async (ctx) => {
            const { scope, identifier, meta } = ctx.params;

            // Auto-detect if identifier is an ID or path
            const resolved = addressResolver.resolve(identifier);

            const cartridge = await services.cartridgeService.read(
                resolved.kind === 'id'
                    ? { kind: 'id', scope: scope as 'project' | 'shared', id: resolved.value }
                    : { kind: 'path', scope: scope as 'project' | 'shared', path: resolved.value }
            );

            // If meta flag is set, output metadata first
            if (meta) {
                ctx.stdio.stdout.write(`ID: ${cartridge.id}\n`);
                ctx.stdio.stdout.write(`Path: ${cartridge.path}\n`);
                ctx.stdio.stdout.write(`Hash: ${cartridge.hash}\n`);
                ctx.stdio.stdout.write(`---\n`);
            }

            // Output the content
            ctx.stdio.stdout.write(cartridge.content);

            // Add trailing newline if content doesn't end with one
            if (!cartridge.content.endsWith('\n')) {
                ctx.stdio.stdout.write('\n');
            }
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ create });
