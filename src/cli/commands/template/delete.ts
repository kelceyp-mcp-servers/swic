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

const deleteCommand = (services: CoreServices) => {
    return createCommand('delete')
        .summary('Delete one or more templates')
        .description(`Deletes one or more templates permanently.

Supports bulk deletion with comma-separated identifiers. Prompts for confirmation
unless --confirm flag is provided. Operation is idempotent - doesn't error if
template is already deleted.

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

  --confirm, -y
    Skip confirmation prompt
    Useful for scripts and automation
    Use with caution - deletion is permanent

CONFIRMATION:
  - Single deletion: Prompts with template identifier
  - Bulk deletion: Shows list of templates, then prompts
  - Skipped with --confirm flag

EXAMPLES:
  # Delete single template (will prompt)
  swic template delete prompts/old.md

  # Delete multiple templates (will prompt)
  swic template delete tpl001,tpl002,prompts/deprecated.md

  # Delete without confirmation
  swic template delete prompts/temp.md --confirm

  # Delete from specific scope
  swic template delete old-workflow.md -s shared -y`)
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

            return true;
        })
        .run(async (ctx) => {
            const { identifier, scope, confirm } = ctx.params;

            // Split by comma, trim, and deduplicate
            const identifiers = [...new Set(
                identifier.split(',').map((s: string) => s.trim()).filter(Boolean)
            )];

            // Build addresses
            const addresses = identifiers.map((id: string) => {
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

            // Confirmation
            if (!confirm) {
                if (addresses.length === 1) {
                    const confirmed = await confirmPrompt(`Delete template "${identifiers[0]}"?`);
                    if (!confirmed) {
                        ctx.logger.info('Cancelled');
                        return;
                    }
                }
                else {
                    ctx.logger.info('Templates to delete:');
                    for (const id of identifiers) {
                        ctx.logger.info(`  - ${id}`);
                    }
                    const confirmed = await confirmPrompt(`Delete ${addresses.length} templates?`);
                    if (!confirmed) {
                        ctx.logger.info('Cancelled');
                        return;
                    }
                }
            }

            // Delete
            const results = addresses.length === 1
                ? [await services.TemplateService.delete(addresses[0])]
                : await services.TemplateService.deleteMany(addresses);

            // Collect deleted IDs
            const deleted: string[] = [];
            const alreadyDeleted: string[] = [];

            for (let i = 0; i < results.length; i++) {
                if (results[i].deleted) {
                    deleted.push(identifiers[i]);
                }
                else {
                    alreadyDeleted.push(identifiers[i]);
                }
            }

            // Output
            if (deleted.length > 0) {
                ctx.stdio.stdout.write(deleted.join('\n') + '\n');
            }

            if (alreadyDeleted.length > 0) {
                ctx.logger.warn(`Already deleted: ${alreadyDeleted.join(', ')}`);
            }

            if (deleted.length > 0) {
                ctx.logger.info(`Deleted ${deleted.length} template(s)`);
            }
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ delete: deleteCommand });
