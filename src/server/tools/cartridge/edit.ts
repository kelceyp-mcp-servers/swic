import { z } from 'zod';
import type { CoreServices } from '../../../core/Core.js';
import type { CartridgeToolApi, ToolDefinition, ToolHandler, ToolResponse } from './shared/types.js';
import CartridgeAddressResolver from '../../../core/utils/CartridgeAddressResolver.js';
import type { EditOp } from '../../../core/services/CartridgeService.js';

/**
 * Creates the 'cartridge_edit' MCP tool
 * Edits cartridge content using text replacement operations
 * Uses optimistic locking with hash verification
 *
 * @param services - Core services including cartridgeService
 * @returns CartridgeToolApi with definition and handler
 */
const create = (services: CoreServices): CartridgeToolApi => {
    const definition: ToolDefinition = {
        name: 'cartridge_edit',
        description: 'Edit cartridge content using text replacement operations. Uses optimistic locking to prevent concurrent modifications.',
        inputSchema: {
            identifier: z.string().describe('Cartridge ID (e.g., "crt001") or path (e.g., "auth/jwt-setup")'),
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
            ]).describe('Edit operation to perform'),
            baseHash: z.string().optional().describe('Optional. Expected hash for optimistic locking. If omitted, automatically fetches current hash.')
        }
    };

    const handler: ToolHandler = async (args) => {
        const { identifier, scope, operation, baseHash } = args;

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
        }

        // Build address
        const isId = CartridgeAddressResolver.isCartridgeId(identifier);
        const address = isId
            ? { kind: 'id' as const, scope: scope as 'project' | 'shared' | undefined, id: identifier }
            : { kind: 'path' as const, scope: scope as 'project' | 'shared' | undefined, path: identifier };

        // Get baseHash if not provided
        let effectiveBaseHash = baseHash;
        if (!effectiveBaseHash) {
            const cartridge = await services.cartridgeService.read(address);
            effectiveBaseHash = cartridge.hash;
        } else {
            validateString(effectiveBaseHash, 'baseHash');
        }

        // Perform edit
        const result = await services.cartridgeService.editLatest(
            address,
            effectiveBaseHash,
            [editOp]
        );

        // Build response
        const message = `Edited cartridge: ${result.id}
Applied: ${result.appliedEdits} edit operation(s)
New hash: ${result.newHash}`;

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

const CartridgeEditTool = Object.freeze({
    create
});

export default CartridgeEditTool;
export type { CartridgeToolApi };
