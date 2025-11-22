import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';

const read = (services: CoreServices) => {
    return createCommand('read')
        .summary('Read one or more templates')
        .description(`Reads and displays the content of one or more templates.

Supports bulk reading by providing comma-separated identifiers.
Output includes the template content and optionally metadata headers.

PARAMETERS:
  identifier
    Template identifier(s) - can be template ID or path
      • Single: tpl001, prompts/init.md
      • Multiple: tpl001,tpl002,prompts/init.md (comma-separated)

    Template IDs: tpl001 (project), stpl001 (shared)
    Paths: prompts/story-init.md, workflows/deploy.md

  --scope, -s
    Scope to search in: "project" or "shared"
    Optional - auto-resolves if omitted (checks project first, then shared)
    Can be inferred from ID prefix (tpl=project, stpl=shared)

  --metadata, -m
    Include metadata header with ID, path, and validity status
    Useful for debugging or verifying template location

EXAMPLES:
  # Read single template by path
  swic template read prompts/init.md

  # Read by template ID
  swic template read tpl001

  # Read multiple templates
  swic template read tpl001,tpl002,prompts/deploy.md

  # Read with metadata
  swic template read prompts/init.md --metadata

  # Read from specific scope
  swic template read init.md -s shared`)
        .param((p) => p
            .name('identifier')
            .type('string')
            .positional(0)
            .required()
            .prompt('Enter template ID or path (comma-separated for multiple)')
        )
        .param((p) => p
            .name('scope')
            .type('string')
            .flag('scope', 's')
        )
        .param((p) => p
            .name('metadata')
            .type('boolean')
            .flag('metadata', 'm')
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
            const { identifier, scope, metadata } = ctx.params;

            // Split by comma, trim, and deduplicate
            const identifiers = [...new Set(
                identifier.split(',').map((s: string) => s.trim()).filter(Boolean)
            )];

            // Build addresses
            const addresses = identifiers.map((id: string) => {
                // Detect if ID or path based on pattern
                const isId = /^(tpl|stpl)\d{3,}$/.test(id);
                if (isId) {
                    return {
                        kind: 'id' as const,
                        id,
                        scope: scope as 'project' | 'shared' | undefined
                    };
                }
                else {
                    return {
                        kind: 'path' as const,
                        path: id,
                        scope: scope as 'project' | 'shared' | undefined
                    };
                }
            });

            // Read templates (bulk if multiple)
            const results = addresses.length === 1
                ? [await services.TemplateService.read(addresses[0])]
                : await services.TemplateService.readMany(addresses, metadata);

            // Output
            for (let i = 0; i < results.length; i++) {
                const result = results[i];

                if (metadata) {
                    ctx.stdio.stdout.write(`ID: ${result.id}\n`);
                    ctx.stdio.stdout.write(`Path: ${result.path}\n`);
                    ctx.stdio.stdout.write(`Valid: ${result.isValid}\n`);
                    ctx.stdio.stdout.write('---\n');
                }

                // Ensure trailing newline
                const content = result.content.endsWith('\n')
                    ? result.content
                    : result.content + '\n';

                ctx.stdio.stdout.write(content);

                // Add separator between multiple templates
                if (i < results.length - 1) {
                    ctx.stdio.stdout.write('\n');
                }
            }
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ read });
