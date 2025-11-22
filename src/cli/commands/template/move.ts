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
        .description(`Moves or renames a template, optionally across scopes.

Generates a new ID for the template at the destination. Supports cross-scope
moves (e.g., from project to shared). Prompts for confirmation unless
--confirm flag is provided.

PARAMETERS:
  source
    Source template identifier - can be template ID or path
    Template IDs: tpl001 (project), stpl001 (shared)
    Paths: prompts/story-init.md, workflows/deploy.md

  destination
    Destination path (not ID)
    Must be a path, not a template ID
    Examples: prompts/new-name.md, workflows/updated.md

  --scope, -s
    Source scope: "project" or "shared"
    Optional - auto-resolves if omitted
    Can be inferred from ID prefix (tpl=project, stpl=shared)

  --to-scope, -t
    Destination scope: "project" or "shared"
    Defaults to source scope if not specified
    Use to move templates between scopes

  --confirm, -y
    Skip confirmation prompt
    Useful for scripts and automation

CROSS-SCOPE MOVES:
  Use --to-scope to move a template from one scope to another:
    • project → shared: Make a project template available globally
    • shared → project: Customize a shared template for this workspace

EXAMPLES:
  # Rename template within same scope
  swic template move prompts/old.md prompts/new.md

  # Move by template ID
  swic template move tpl001 workflows/updated.md

  # Move from project to shared scope
  swic template move prompts/init.md common/init.md --to-scope shared

  # Move from shared to project (customize)
  swic template move common/base.md custom/base.md -s shared -t project

  # Move without confirmation
  swic template move old.md new.md --confirm`)
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
