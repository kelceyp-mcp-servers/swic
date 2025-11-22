import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';

const getParameters = (services: CoreServices) => {
    return createCommand('get-parameters')
        .summary('Get parameter definitions for a template')
        .description(`Retrieves parameter definitions from a template's front matter.

Returns a JSON object listing all parameters defined in the template, including:
  • Parameter names
  • Types (string, number, boolean)
  • Whether they're required or optional
  • Default values (if specified)
  • Descriptions (if provided in template)

Use this before rendering a template to discover what parameters it accepts.

PARAMETERS:
  identifier
    Template identifier - can be template ID or path:
      • Template ID: tpl001 (project), stpl001 (shared)
      • Path: prompts/story-init.md, workflows/deploy.md

  --scope, -s
    Scope to search in: "project" or "shared"
    Optional - auto-resolves if omitted (checks project first, then shared)
    Can be inferred from ID prefix (tpl=project, stpl=shared)

EXAMPLES:
  # Get parameters for a template by path
  swic template get-parameters prompts/story-init.md

  # Get parameters by template ID
  swic template get-parameters tpl001

  # Specify scope explicitly
  swic template get-parameters init.md -s shared`)
        .param((p) => p
            .name('identifier')
            .type('string')
            .positional(0)
            .required()
            .prompt('Enter template ID or path')
        )
        .param((p) => p
            .name('scope')
            .type('string')
            .flag('scope', 's')
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
            const { identifier, scope } = ctx.params;

            // Build address
            const isId = /^(tpl|stpl)\d{3,}$/.test(identifier);
            const address = isId
                ? { kind: 'id' as const, id: identifier, scope: scope as 'project' | 'shared' | undefined }
                : { kind: 'path' as const, path: identifier, scope: scope as 'project' | 'shared' | undefined };

            // Get parameters
            const params = await services.TemplateService.getParameters(address);

            // Output as JSON
            ctx.stdio.stdout.write(JSON.stringify({ parameters: params }, null, 2));
            ctx.stdio.stdout.write('\n');
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ getParameters });
