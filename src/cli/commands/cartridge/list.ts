import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';

/**
 * Creates the 'list' command for the cartridge CLI group.
 * Lists all cartridges in a scope with optional filtering.
 *
 * @param services - Core services including cartridgeService
 * @returns Built CLI command
 */
const create = (services: CoreServices) => {
    return createCommand('list')
        .summary('List cartridges in a scope')
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
            .name('prefix')
            .type('string')
            .flag('prefix', 'p')
        )
        .param((p) => p
            .name('full')
            .type('boolean')
            .flag('full', 'f')
        )
        .run(async (ctx) => {
            const { scope, prefix, full } = ctx.params;

            const items = await services.cartridgeService.list({
                scope: scope as 'project' | 'shared',
                pathPrefix: prefix,
                includeContent: full || false
            });

            if (items.length === 0) {
                ctx.logger.info(`No cartridges found in ${scope} scope`);
                return;
            }

            // Determine column widths
            const maxIdWidth = Math.max(
                6,
                ...items.map(item => item.id.length)
            );
            const maxPathWidth = Math.max(
                10,
                ...items.map(item => item.path.length)
            );

            // Print header
            if (full) {
                const header = `${'ID'.padEnd(maxIdWidth)}  ${'PATH'.padEnd(maxPathWidth)}  SYNOPSIS`;
                ctx.stdio.stdout.write(header + '\n');
            }
            else {
                const header = `${'ID'.padEnd(maxIdWidth)}  PATH`;
                ctx.stdio.stdout.write(header + '\n');
            }

            // Print items
            for (const item of items) {
                if (full) {
                    const synopsis = item.synopsis || '';
                    const line = `${item.id.padEnd(maxIdWidth)}  ${item.path.padEnd(maxPathWidth)}  ${synopsis}`;
                    ctx.stdio.stdout.write(line + '\n');
                }
                else {
                    const line = `${item.id.padEnd(maxIdWidth)}  ${item.path}`;
                    ctx.stdio.stdout.write(line + '\n');
                }
            }
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ create });
