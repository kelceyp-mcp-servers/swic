import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';

const render = (services: CoreServices) => {
    return createCommand('render')
        .summary('Render a template with parameters')
        .description(`Renders a template by substituting parameter values into the template content.

PARAMETERS:
  identifier
    Template identifier - can be template ID or path:
      • Template ID: tpl001 (project), stpl001 (shared)
      • Path: prompts/story-init.md, workflows/deploy.md

  --scope, -s
    Scope to search in: "project" or "shared"
    Optional - auto-resolves if omitted (checks project first, then shared)
    Can be inferred from ID prefix (tpl=project, stpl=shared)

  --param, -p
    Template parameters as key=value pairs
    Can specify multiple parameters comma-separated or repeat the flag
    Values are automatically type-coerced:
      • Booleans: "true" or "false" → boolean
      • Numbers: digits with optional decimal → number
      • Strings: everything else → string

    Use 'swic template get-parameters <identifier>' to discover available parameters

EXAMPLES:
  # Render with single parameter
  swic template render prompts/init.md --param name=myproject

  # Multiple parameters (comma-separated)
  swic template render prompts/init.md --param name=myproject,verbose=true,count=5

  # Multiple parameters (repeated flag)
  swic template render tpl001 -p env=prod -p region=us-west

  # Specify scope explicitly
  swic template render story-init.md -s shared -p id=042,name=auth-feature`)
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
        .param((p) => p
            .name('param')
            .type('string')
            .flag('param', 'p')
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
            const { identifier, scope, param } = ctx.params;

            // Parse parameters from --param key=value,key2=value2 format
            const params: Record<string, string | number | boolean> = {};

            if (param) {
                // Split by comma to handle multiple params
                const paramList = param.split(',').map((s: string) => s.trim()).filter(Boolean);
                for (const p of paramList) {
                    const eqIndex = p.indexOf('=');
                    if (eqIndex === -1) {
                        throw new Error(`Invalid parameter format: ${p}. Use --param key=value or --param key1=value1,key2=value2`);
                    }

                    const key = p.slice(0, eqIndex).trim();
                    let value: string | number | boolean = p.slice(eqIndex + 1).trim();

                    // Try to parse as number or boolean
                    if (value === 'true') {
                        value = true;
                    }
                    else if (value === 'false') {
                        value = false;
                    }
                    else if (/^\d+(\.\d+)?$/.test(value)) {
                        value = parseFloat(value);
                    }

                    params[key] = value;
                }
            }

            // Build address
            const isId = /^(tpl|stpl)\d{3,}$/.test(identifier);
            const address = isId
                ? { kind: 'id' as const, id: identifier, scope: scope as 'project' | 'shared' | undefined }
                : { kind: 'path' as const, path: identifier, scope: scope as 'project' | 'shared' | undefined };

            // Render
            const rendered = await services.TemplateService.render(address, params);

            // Output
            ctx.stdio.stdout.write(rendered);

            // Ensure trailing newline
            if (!rendered.endsWith('\n')) {
                ctx.stdio.stdout.write('\n');
            }
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ render });
