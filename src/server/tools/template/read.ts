import { z } from 'zod';
import type { CoreServices } from '../../../core/Core.js';
import type { TemplateToolApi, ToolDefinition, ToolHandler } from './shared/types.js';

const create = (services: CoreServices): TemplateToolApi => {
    const definition: ToolDefinition = {
        name: 'template_read',
        description: 'Read one or more templates by ID or path. Supports bulk operations by passing an array of identifiers.',
        inputSchema: {
            identifier: z.union([z.string(), z.array(z.string())]).describe('Single template ID (e.g., "tpl001") or path (e.g., "prompts/story-init.md"), or array for bulk read'),
            scope: z.enum(['project', 'shared']).optional().describe('Optional scope. If omitted, auto-resolves (checks project first, then shared, or infers from ID prefix)'),
            includeMetadata: z.boolean().optional().default(false).describe('Include ID and path metadata header for each template')
        }
    };

    const handler: ToolHandler = async (args) => {
        const { identifier, scope, includeMetadata } = args;

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

        // Read templates
        const results = addresses.length === 1
            ? [await services.TemplateService.read(addresses[0])]
            : await services.TemplateService.readMany(addresses, includeMetadata);

        // Format output
        let output = '';
        for (let i = 0; i < results.length; i++) {
            const result = results[i];

            if (includeMetadata) {
                output += `ID: ${result.id}\n`;
                output += `Path: ${result.path}\n`;
                output += `Valid: ${result.isValid}\n`;
                output += '---\n';
            }

            output += result.content;

            if (!result.content.endsWith('\n')) {
                output += '\n';
            }

            if (i < results.length - 1) {
                output += '\n';
            }
        }

        return {
            content: [
                {
                    type: 'text',
                    text: output
                }
            ]
        };
    };

    return Object.freeze({
        definition,
        handler
    });
};

const templateReadTool = Object.freeze({
    create
});

export default templateReadTool;
