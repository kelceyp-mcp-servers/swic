import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';
import chalk from 'chalk';

const list = (services: CoreServices) => {
    return createCommand('list')
        .summary('List all templates')
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
            // Scope validation
            if (ctx.argv.flags.scope &&
                ctx.argv.flags.scope !== 'project' &&
                ctx.argv.flags.scope !== 'shared') {
                return 'Scope must be "project" or "shared"';
            }

            return true;
        })
        .run(async (ctx) => {
            const { scope, prefix, full } = ctx.params;

            const templates = await services.TemplateService.list({
                scope: scope as 'project' | 'shared' | undefined,
                pathPrefix: prefix,
                includeContent: full
            });

            if (templates.length === 0) {
                ctx.logger.info('No templates found');
                return;
            }

            // Calculate column widths
            const maxIdLen = Math.max(8, ...templates.map(t => t.id.length));
            const maxPathLen = Math.max(8, ...templates.map(t => t.path.length));

            // Header
            if (scope) {
                // Single scope: ID, PATH, VALID, [SYNOPSIS]
                const header = [
                    'ID'.padEnd(maxIdLen),
                    'PATH'.padEnd(maxPathLen),
                    'VALID'
                ];
                if (full) {
                    header.push('SYNOPSIS');
                }
                ctx.stdio.stdout.write(header.join('  ') + '\n');
            }
            else {
                // Both scopes: ID, PATH, SCOPE, VALID, OVERRIDE, [SYNOPSIS]
                const header = [
                    'ID'.padEnd(maxIdLen),
                    'PATH'.padEnd(maxPathLen),
                    'SCOPE'.padEnd(7),
                    'VALID'.padEnd(5),
                    'OVERRIDE'
                ];
                if (full) {
                    header.push('SYNOPSIS');
                }
                ctx.stdio.stdout.write(header.join('  ') + '\n');
            }

            // Rows
            for (const template of templates) {
                const parts: string[] = [];

                if (scope) {
                    // Single scope
                    parts.push(template.id.padEnd(maxIdLen));
                    parts.push(template.path.padEnd(maxPathLen));
                    parts.push(template.isValid ? 'true ' : 'false');
                    if (full) {
                        parts.push(template.synopsis || '-');
                    }
                }
                else {
                    // Both scopes with colors
                    const idColored = template.scope === 'project'
                        ? chalk.cyan(template.id.padEnd(maxIdLen))
                        : chalk.green(template.id.padEnd(maxIdLen));
                    parts.push(idColored);
                    parts.push(template.path.padEnd(maxPathLen));
                    parts.push(template.scope.padEnd(7));
                    parts.push((template.isValid ? 'true' : 'false').padEnd(5));
                    parts.push(template.override || '-');
                    if (full) {
                        parts.push(template.synopsis || '-');
                    }
                }

                ctx.stdio.stdout.write(parts.join('  ') + '\n');
            }
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ list });
