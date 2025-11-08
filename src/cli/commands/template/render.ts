import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';

const render = (services: CoreServices) => {
    return createCommand('render')
        .summary('Render a template with parameters')
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
            .multi()
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

            // Parse parameters from --param key=value format
            const params: Record<string, string | number | boolean> = {};

            if (param) {
                const paramList = Array.isArray(param) ? param : [param];
                for (const p of paramList) {
                    const eqIndex = p.indexOf('=');
                    if (eqIndex === -1) {
                        throw new Error(`Invalid parameter format: ${p}. Use --param key=value`);
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
