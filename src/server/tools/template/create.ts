import { z } from 'zod';
import type { CoreServices } from '../../../core/Core.js';
import type { TemplateToolApi, ToolDefinition, ToolHandler } from './shared/types.js';

const create = (services: CoreServices): TemplateToolApi => {
    const definition: ToolDefinition = {
        name: 'template_create',
        description: 'Create a new template with content. Returns the created template ID.',
        inputSchema: {
            scope: z.enum(['project', 'shared']).describe('Scope for the template (project or shared)'),
            path: z.string().describe('Path for the template (e.g., "prompts/story-init.md")'),
            content: z.string().describe('Content of the template including front matter')
        }
    };

    const handler: ToolHandler = async (args) => {
        const { scope, path, content } = args;

        const result = await services.TemplateService.create({
            address: {
                kind: 'path',
                scope: scope as 'project' | 'shared',
                path
            },
            content
        });

        return {
            content: [
                {
                    type: 'text',
                    text: `Created template: ${result.id} at ${result.path}`
                }
            ]
        };
    };

    return Object.freeze({
        definition,
        handler
    });
};

const templateCreateTool = Object.freeze({
    create
});

export default templateCreateTool;
export type { TemplateToolApi };
