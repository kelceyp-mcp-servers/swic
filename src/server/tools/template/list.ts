import { z } from 'zod';
import type { CoreServices } from '../../../core/Core.js';
import type { TemplateToolApi, ToolDefinition, ToolHandler } from './shared/types.js';

const create = (services: CoreServices): TemplateToolApi => {
    const definition: ToolDefinition = {
        name: 'template_list',
        description: 'List templates with optional filtering. Returns structured JSON with template metadata.',
        inputSchema: {
            scope: z.enum(['project', 'shared']).optional().describe('Optional scope filter. If omitted, lists from both scopes and detects overrides (project templates that shadow shared ones)'),
            pathPrefix: z.string().optional().describe('Optional path prefix filter (e.g., "prompts/" to list only templates in prompts namespace)'),
            includeContent: z.boolean().optional().default(false).describe('Include synopsis from front matter in results')
        }
    };

    const handler: ToolHandler = async (args) => {
        const { scope, pathPrefix, includeContent } = args;

        const templates = await services.TemplateService.list({
            scope: scope as 'project' | 'shared' | undefined,
            pathPrefix,
            includeContent
        });

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        templates: templates.map(t => ({
                            id: t.id,
                            path: t.path,
                            scope: t.scope,
                            isValid: t.isValid,
                            synopsis: t.synopsis,
                            override: t.override
                        })),
                        count: templates.length
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

const templateListTool = Object.freeze({
    create
});

export default templateListTool;
