import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';
import chalk from 'chalk';

const list = (services: CoreServices) => {
    return createCommand('list')
        .summary('List all templates')
        .description(`Lists templates with optional filtering and override detection.

When no scope is specified, lists templates from both scopes and detects overrides
(project templates that shadow shared templates at the same path).

OUTPUT COLUMNS:
  - ID: Template identifier (tpl001=project, stpl001=shared)
  - PATH: Template path within scope
  - SCOPE: "project" or "shared" (only when listing both scopes)
  - VALID: Whether template has valid front matter
  - OVERRIDE: Shows override relationship (only when listing both scopes)
  - SYNOPSIS: Brief description from front matter (with --full flag)

PARAMETERS:
  --scope, -s
    Scope to list: "project" or "shared"
    Omit to list both scopes with override detection
    When specified, shows simplified 3-column output

  --prefix, -p
    Filter by path prefix
    Examples: "prompts/", "workflows/story"
    Useful for viewing templates in specific directories

  --full, -f
    Include synopsis column from template front matter
    Shows brief description of each template

COLOR CODING (both scopes mode):
  • Cyan: Project templates
  • Green: Shared templates

EXAMPLES:
  # List all templates from both scopes
  swic template list

  # List only project templates
  swic template list --scope project

  # List templates in prompts/ directory
  swic template list --prefix prompts/

  # List with synopsis descriptions
  swic template list --full

  # List shared templates starting with "common/"
  swic template list -s shared -p common/`)
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
