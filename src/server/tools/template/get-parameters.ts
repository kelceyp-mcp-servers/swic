import { z } from 'zod';
import type { CoreServices } from '../../../core/Core.js';
import type { TemplateToolApi, ToolDefinition, ToolHandler } from './shared/types.js';

const create = (services: CoreServices): TemplateToolApi => {
    const definition: ToolDefinition = {
        name: 'template_get_parameters',
        description: 'Get parameter definitions for a template. Extracts parameter metadata from front matter.',
        inputSchema: {
            identifier: z.string().describe('Template ID (e.g., "tpl001") or path (e.g., "prompts/story-init.md")'),
            scope: z.enum(['project', 'shared']).optional().describe('Optional scope. Auto-resolves if omitted')
        }
    };

    const handler: ToolHandler = async (args) => {
        const { identifier, scope } = args;

        // Build address
        const isId = /^(tpl|stpl)\d{3,}$/.test(identifier);
        const address = isId
            ? { kind: 'id' as const, id: identifier, scope: scope as 'project' | 'shared' | undefined }
            : { kind: 'path' as const, path: identifier, scope: scope as 'project' | 'shared' | undefined };

        const params = await services.TemplateService.getParameters(address);

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({ parameters: params }, null, 2)
                }
            ]
        };
    };

    return Object.freeze({
        definition,
        handler
    });
};

const templateGetParametersTool = Object.freeze({
    create
});

export default templateGetParametersTool;
