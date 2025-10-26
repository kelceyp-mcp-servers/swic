import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';

const create = (services: CoreServices) => {
    return createCommand('create')
        .summary('Create a new cartridge')
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
            .build()
        )
        .param((p) => p
            .name('path')
            .type('string')
            .positional(1)
            .required()
            .build()
        )
        .param((p) => p
            .name('content')
            .type('string')
            .flag('content', 'c')
            .stdin()
            .required()
            .build()
        )
        .run(async (ctx) => {
            const { scope, path, content } = ctx.params;

            const result = await services.cartridgeService.create({
                address: { kind: 'path', scope: scope as 'project' | 'shared', path },
                content
            });

            ctx.stdio.stdout.write(`${result.id}\n`);
            ctx.logger.info(`Created cartridge: ${result.id} at ${path}`);
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ create });
