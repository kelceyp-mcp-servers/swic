import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';
import * as readline from 'readline';

/**
 * Prompt user for confirmation using readline
 */
const confirmPrompt = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(`${message} [y/N] `, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
};

const move = (services: CoreServices) => {
    return createCommand('move')
        .summary('Move or rename a template')
        .param((p) => p
            .name('source')
            .type('string')
            .positional(0)
            .prompt('Enter source template ID or path')
        )
        .param((p) => p
            .name('destination')
            .type('string')
            .positional(1)
            .prompt('Enter destination path')
        )
        .param((p) => p
            .name('scope')
            .type('string')
            .flag('scope', 's')
        )
        .param((p) => p
            .name('toScope')
            .type('string')
            .flag('to-scope', 't')
        )
        .param((p) => p
            .name('confirm')
            .type('boolean')
            .flag('confirm', 'y')
        )
        .preValidate((ctx) => {
            // Scope validation
            if (ctx.argv.flags.scope &&
                ctx.argv.flags.scope !== 'project' &&
                ctx.argv.flags.scope !== 'shared') {
                return 'Scope must be "project" or "shared"';
            }

            if (ctx.argv.flags.toScope &&
                ctx.argv.flags.toScope !== 'project' &&
                ctx.argv.flags.toScope !== 'shared') {
                return 'To-scope must be "project" or "shared"';
            }

            return true;
        })
        .run(async (ctx) => {
            const { source, destination, scope, toScope, confirm } = ctx.params;

            // Build source address
            const isId = /^(tpl|stpl)\d{3,}$/.test(source);
            const sourceAddress = isId
                ? { kind: 'id' as const, id: source, scope: scope as 'project' | 'shared' | undefined }
                : { kind: 'path' as const, path: source, scope: scope as 'project' | 'shared' | undefined };

            // Confirmation
            if (!confirm) {
                const isCrossScope = toScope && toScope !== (scope || 'project');
                const message = isCrossScope
                    ? `Move template from ${scope || 'project'} to ${toScope}: "${source}" → "${destination}"?`
                    : `Move template "${source}" → "${destination}"?`;

                const confirmed = await confirmPrompt(message);

                if (!confirmed) {
                    ctx.logger.info('Cancelled');
                    return;
                }
            }

            // Move
            const result = await services.TemplateService.move(
                sourceAddress,
                destination,
                toScope as 'project' | 'shared' | undefined
            );

            // Output new ID
            ctx.stdio.stdout.write(`${result.newId}\n`);

            // Log info
            if (result.sourceScope !== result.destinationScope) {
                ctx.logger.info(
                    `Moved ${result.sourceScope} template ${result.oldId} to ${result.destinationScope} template ${result.newId}`
                );
            }
            else {
                ctx.logger.info(
                    `Moved template: ${result.oldId} → ${result.newId}`
                );
            }
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ move });
