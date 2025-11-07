import { z } from 'zod';
import type { CoreServices } from '../../../core/Core.js';
import type { DocToolApi, ToolDefinition, ToolHandler } from './shared/types.js';
import docAddressResolver from '../../../core/utils/DocAddressResolver.js';
import type { EditOp } from '../../../core/services/DocService.js';

/**
 * Creates the 'doc_edit' MCP tool
 * Edits doc content using text replacement operations
 * Uses last-write-wins semantics
 *
 * @param services - Core services including docService
 * @returns docToolApi with definition and handler
 */
const create = (services: CoreServices): DocToolApi => {
    const definition: ToolDefinition = {
        name: 'doc_edit',
        description: 'Edit doc content using text replacement operations. Uses last-write-wins semantics.',
        inputSchema: {
            identifier: z.string().describe('doc ID (e.g., "doc001") or path (e.g., "auth/jwt-setup.md")'),
            scope: z.enum(['project', 'shared']).optional().describe('Optional scope. Auto-resolves if omitted (checks project first, then shared, or infers from ID prefix)'),
            operation: z.discriminatedUnion('type', [
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
                    flags: z.string().optional(),
                    replacement: z.string()
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

        // Map operation to EditOp (Zod has already validated the structure)
        let editOp: EditOp;

        switch (operation.type) {
        case 'replaceOnce':
            editOp = {
                op: 'replaceOnce',
                oldText: operation.oldText,
                newText: operation.newText
            };
            break;

        case 'replaceAll':
            editOp = {
                op: 'replaceAll',
                oldText: operation.oldText,
                newText: operation.newText
            };
            break;

        case 'replaceRegex':
            editOp = {
                op: 'replaceRegex',
                pattern: operation.pattern,
                flags: operation.flags || '',
                replacement: operation.replacement
            };
            break;

        case 'replaceAllContent':
            editOp = {
                op: 'replaceAllContent',
                content: operation.content
            };
            break;

        default:
            throw new Error(`Unknown operation type: ${(operation as any).type}`);
        }

        // Build address
        const isId = docAddressResolver.isdocId(identifier);
        const address = isId
            ? { kind: 'id' as const, scope: scope as 'project' | 'shared' | undefined, id: identifier }
            : { kind: 'path' as const, scope: scope as 'project' | 'shared' | undefined, path: identifier };

        // Perform edit
        const result = await services.DocService.editLatest(
            address,
            [editOp]
        );

        // Build response
        const message = `Edited doc: ${identifier}
Applied: ${result.applied} edit operation(s)`;

        return {
            content: [
                {
                    type: 'text',
                    text: message
                }
            ]
        };
    };

    return Object.freeze({
        definition,
        handler
    });
};

const docEditTool = Object.freeze({
    create
});

export default docEditTool;
export type { DocToolApi };
