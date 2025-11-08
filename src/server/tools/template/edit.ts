import { z } from 'zod';
import type { CoreServices } from '../../../core/Core.js';
import type { TemplateToolApi, ToolDefinition, ToolHandler } from './shared/types.js';

const create = (services: CoreServices): TemplateToolApi => {
    const definition: ToolDefinition = {
        name: 'template_edit',
        description: 'Edit template content using text replacement operations. Uses last-write-wins semantics.',
        inputSchema: {
            identifier: z.string().describe('Template ID (e.g., "tpl001") or path (e.g., "prompts/story-init.md")'),
            scope: z.enum(['project', 'shared']).optional().describe('Optional scope. Auto-resolves if omitted'),
            operation: z.union([
                z.object({
                    type: z.literal('replaceOnce'),
                    oldText: z.string(),
                    newText: z.string()
                }),
                z.object({
                    type: z.literal('replaceAll'),
                    oldText: z.string(),
                    newText: z.string()
                }),
                z.object({
                    type: z.literal('replaceRegex'),
                    pattern: z.string(),
                    replacement: z.string(),
                    flags: z.string().optional()
                }),
                z.object({
                    type: z.literal('replaceAllContent'),
                    content: z.string()
                })
            ]).describe('Edit operation to perform')
        }
    };

    const handler: ToolHandler = async (args) => {
        const { identifier, scope, operation } = args;

        // Build address
        const isId = /^(tpl|stpl)\d{3,}$/.test(identifier);
        const address = isId
            ? { kind: 'id' as const, id: identifier, scope: scope as 'project' | 'shared' | undefined }
            : { kind: 'path' as const, path: identifier, scope: scope as 'project' | 'shared' | undefined };

        // Convert operation to EditOp format
        let editOp;
        if (operation.type === 'replaceOnce') {
            editOp = { op: 'replaceOnce' as const, oldText: operation.oldText, newText: operation.newText };
        }
        else if (operation.type === 'replaceAll') {
            editOp = { op: 'replaceAll' as const, oldText: operation.oldText, newText: operation.newText };
        }
        else if (operation.type === 'replaceRegex') {
            editOp = { op: 'replaceRegex' as const, pattern: operation.pattern, replacement: operation.replacement, flags: operation.flags };
        }
        else {
            editOp = { op: 'replaceAllContent' as const, content: operation.content };
        }

        const result = await services.TemplateService.edit(address, [editOp]);

        return {
            content: [
                {
                    type: 'text',
                    text: `Edited template: ${identifier}\nApplied: ${result.applied} edit operation(s)`
                }
            ]
        };
    };

    return Object.freeze({
        definition,
        handler
    });
};

const templateEditTool = Object.freeze({
    create
});

export default templateEditTool;
