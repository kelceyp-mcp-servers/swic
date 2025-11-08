import { z } from 'zod';
import type { CoreServices } from '../../../core/Core.js';
import type { TemplateToolApi, ToolDefinition, ToolHandler } from './shared/types.js';

const create = (services: CoreServices): TemplateToolApi => {
    const definition: ToolDefinition = {
        name: 'template_delete',
        description: 'Delete one or more templates. Idempotent - does not error if template already deleted. Supports bulk operations by passing an array of identifiers.',
        inputSchema: {
            identifier: z.union([z.string(), z.array(z.string())]).describe('Template ID (e.g., "tpl001") or path (e.g., "prompts/story-init.md"), single or array'),
            scope: z.enum(['project', 'shared']).optional().describe('Optional scope. Auto-resolves if omitted (checks project first, then shared, or infers from ID prefix)')
        }
    };

    const handler: ToolHandler = async (args) => {
        const { identifier, scope } = args;

        const identifiers = Array.isArray(identifier) ? identifier : [identifier];

        // Deduplicate
        const unique = [...new Set(identifiers)];

        // Build addresses
        const addresses = unique.map((id: string) => {
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

        // Delete
        const results = addresses.length === 1
            ? [await services.TemplateService.delete(addresses[0])]
            : await services.TemplateService.deleteMany(addresses);

        // Summarize results
        const deleted = results.filter(r => r.deleted).length;
        const alreadyDeleted = results.length - deleted;

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        deleted,
                        alreadyDeleted,
                        total: results.length
                    }, null, 2)
                }
            ]
        };
    };

    return Object.freeze({
        definition,
        handler
    });
};

const templateDeleteTool = Object.freeze({
    create
});

export default templateDeleteTool;
