import { z } from 'zod';
import type { CoreServices } from '../../../core/Core.js';
import type { TemplateToolApi, ToolDefinition, ToolHandler } from './shared/types.js';

const create = (services: CoreServices): TemplateToolApi => {
    const definition: ToolDefinition = {
        name: 'template_move',
        description: 'Move or rename a template to a new path. Generates a new ID. Supports cross-scope moves.',
        inputSchema: {
            source: z.string().describe('Source template ID (e.g., "tpl001") or path (e.g., "prompts/story-init.md")'),
            destination: z.string().describe('Destination path (not ID) for the template'),
            sourceScope: z.enum(['project', 'shared']).optional().describe('Optional. Source scope. Auto-resolves if omitted.'),
            destinationScope: z.enum(['project', 'shared']).optional().describe('Optional. Destination scope. Defaults to source scope if omitted.')
        }
    };

    const handler: ToolHandler = async (args) => {
        const { source, destination, sourceScope, destinationScope } = args;

        // Build source address
        const isId = /^(tpl|stpl)\d{3,}$/.test(source);
        const sourceAddress = isId
            ? { kind: 'id' as const, id: source, scope: sourceScope as 'project' | 'shared' | undefined }
            : { kind: 'path' as const, path: source, scope: sourceScope as 'project' | 'shared' | undefined };

        const result = await services.TemplateService.move(
            sourceAddress,
            destination,
            destinationScope as 'project' | 'shared' | undefined
        );

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        oldId: result.oldId,
                        newId: result.newId,
                        oldPath: result.oldPath,
                        newPath: result.newPath,
                        sourceScope: result.sourceScope,
                        destinationScope: result.destinationScope,
                        message: `Moved template: ${result.oldId} → ${result.newId}`
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

const templateMoveTool = Object.freeze({
    create
});

export default templateMoveTool;
