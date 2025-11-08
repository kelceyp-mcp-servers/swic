import { z } from 'zod';
import type { CoreServices } from '../../../core/Core.js';
import type { TemplateToolApi, ToolDefinition, ToolHandler } from './shared/types.js';

const create = (services: CoreServices): TemplateToolApi => {
    const definition: ToolDefinition = {
        name: 'template_render',
        description: 'Render a template with provided parameters. Validates required parameters before rendering.',
        inputSchema: {
            identifier: z.string().describe('Template ID (e.g., "tpl001") or path (e.g., "prompts/story-init.md")'),
            scope: z.enum(['project', 'shared']).optional().describe('Optional scope. Auto-resolves if omitted'),
            params: z.record(z.union([z.string(), z.number(), z.boolean()])).describe('Parameter values as key-value pairs')
        }
    };

    const handler: ToolHandler = async (args) => {
        const { identifier, scope, params } = args;

        // Build address
        const isId = /^(tpl|stpl)\d{3,}$/.test(identifier);
        const address = isId
            ? { kind: 'id' as const, id: identifier, scope: scope as 'project' | 'shared' | undefined }
            : { kind: 'path' as const, path: identifier, scope: scope as 'project' | 'shared' | undefined };

        const rendered = await services.TemplateService.render(address, params || {});

        return {
            content: [
                {
                    type: 'text',
                    text: rendered
                }
            ]
        };
    };

    return Object.freeze({
        definition,
        handler
    });
};

const templateRenderTool = Object.freeze({
    create
});

export default templateRenderTool;
