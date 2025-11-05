import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';

// ANSI color codes
const COLORS = {
    project: '\x1b[36m',  // Cyan for project
    shared: '\x1b[32m',   // Green for shared
    reset: '\x1b[0m'
};

/**
 * Creates the 'list' command for the doc CLI group.
 * Lists all docs (both scopes by default) with override detection.
 * Scope is optional - omit to list from both scopes.
 *
 * @param services - Core services including docService
 * @returns Built CLI command
 */
const create = (services: CoreServices) => {
    return createCommand('list')
        .summary('List docs (defaults to both scopes with override detection)')
        .param((p) => p
            .name('scope')
            .type('string')
            .flag('scope', 's')
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
        .preValidate((ctx) => {
            if (ctx.argv.flags.scope &&
                ctx.argv.flags.scope !== 'project' &&
                ctx.argv.flags.scope !== 'shared') {
                return 'Scope must be "project" or "shared"';
            }
            return true;
        })
        .run(async (ctx) => {
            const { scope, prefix, full } = ctx.params;

            const items = await services.DocService.list({
                scope: scope as 'project' | 'shared' | undefined,
                pathPrefix: prefix,
                includeContent: full || false
            });

            if (items.length === 0) {
                const scopeMsg = scope ? `in ${scope} scope` : '';
                ctx.logger.info(`No docs found ${scopeMsg}`);
                return;
            }

            // Determine column widths
            const maxIdWidth = Math.max(8, ...items.map(item => item.id.length));
            const maxPathWidth = Math.max(10, ...items.map(item => item.path.length));
            const maxScopeWidth = 8; // 'project' or 'shared'
            const maxOverrideWidth = 10; // 'overrides' or 'overridden'

            // Print header (4 columns when no scope specified)
            if (!scope) {
                if (full) {
                    const header = `${'ID'.padEnd(maxIdWidth)}  ${'NAME'.padEnd(maxPathWidth)}  ${'SCOPE'.padEnd(maxScopeWidth)}  ${'OVERRIDE'.padEnd(maxOverrideWidth)}  SYNOPSIS`;
                    ctx.stdio.stdout.write(header + '\n');
                }
                else {
                    const header = `${'ID'.padEnd(maxIdWidth)}  ${'NAME'.padEnd(maxPathWidth)}  ${'SCOPE'.padEnd(maxScopeWidth)}  OVERRIDE`;
                    ctx.stdio.stdout.write(header + '\n');
                }
            }
            else {
                // Legacy 2-column format when scope is specified
                if (full) {
                    const header = `${'ID'.padEnd(maxIdWidth)}  ${'PATH'.padEnd(maxPathWidth)}  SYNOPSIS`;
                    ctx.stdio.stdout.write(header + '\n');
                }
                else {
                    const header = `${'ID'.padEnd(maxIdWidth)}  PATH`;
                    ctx.stdio.stdout.write(header + '\n');
                }
            }

            // Print items
            for (const item of items) {
                const color = COLORS[item.scope];
                const reset = COLORS.reset;

                if (!scope) {
                    // 4-column format with color coding
                    const overrideStr = item.override || '-';
                    if (full) {
                        const synopsis = item.synopsis || '';
                        const line = `${color}${item.id.padEnd(maxIdWidth)}${reset}  ${item.path.padEnd(maxPathWidth)}  ${color}${item.scope.padEnd(maxScopeWidth)}${reset}  ${overrideStr.padEnd(maxOverrideWidth)}  ${synopsis}`;
                        ctx.stdio.stdout.write(line + '\n');
                    }
                    else {
                        const line = `${color}${item.id.padEnd(maxIdWidth)}${reset}  ${item.path.padEnd(maxPathWidth)}  ${color}${item.scope.padEnd(maxScopeWidth)}${reset}  ${overrideStr}`;
                        ctx.stdio.stdout.write(line + '\n');
                    }
                }
                else {
                    // Legacy 2-column format
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
            }
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ create });
