import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';

const getParameters = (services: CoreServices) => {
    return createCommand('get-parameters')
        .summary('Get parameter definitions for a template')
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
