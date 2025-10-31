import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';
import CartridgeAddressResolver from '../../../core/utils/CartridgeAddressResolver.js';

/**
 * Creates the 'read' command for the cartridge CLI group.
 * Reads and outputs one or more cartridges' content.
 * Accepts comma-separated identifiers (e.g., "crt001,crt002,crt003").
 * Multiple cartridges are separated by empty lines in output.
 * Scope is optional - checks project first, then shared (or inferred from ID).
 *
 * @param services - Core services including cartridgeService
 * @returns Built CLI command
 */
const create = (services: CoreServices) => {
    return createCommand('read')
        .summary('Read cartridge(s) - comma-separated (auto-resolves scope)')
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
            .name('meta')
            .type('boolean')
            .flag('meta', 'm')
        )
        .run(async (ctx) => {
            const { identifier, scope, meta } = ctx.params;

            // Parse comma-separated identifiers and deduplicate
            const identifiers = identifier.includes(',')
                ? [...new Set(identifier.split(',').map(id => id.trim()).filter(Boolean))]
                : [identifier];

            // Handle empty result after parsing
            if (identifiers.length === 0) {
                throw new Error('No identifiers provided');
            }

            // Validation phase: basic format check
            for (const id of identifiers) {
                if (!id || id.length === 0) {
                    throw new Error(`Invalid identifier: empty string`);
                }
            }

            // Read phase: read all cartridges in parallel
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

            // Output phase: write each cartridge with empty line separator
            for (let i = 0; i < cartridges.length; i++) {
                const cartridge = cartridges[i];

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

                // Add empty line separator between cartridges (but not after the last one)
                if (i < cartridges.length - 1) {
                    ctx.stdio.stdout.write('\n');
                }
            }
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ create });
