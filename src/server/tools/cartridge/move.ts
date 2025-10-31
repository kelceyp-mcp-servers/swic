import { z } from 'zod';
import type { CoreServices } from '../../../core/Core.js';
import type { CartridgeToolApi, ToolDefinition, ToolHandler, ToolResponse } from './shared/types.js';
import CartridgeAddressResolver from '../../../core/utils/CartridgeAddressResolver.js';

/**
 * Creates the 'cartridge_move' MCP tool
 * Moves or renames a cartridge to a new path
 * Generates a new ID (even for same-scope moves)
 * Supports cross-scope moves with explicit destinationScope parameter
 *
 * @param services - Core services including cartridgeService
 * @returns CartridgeToolApi with definition and handler
 */
const create = (services: CoreServices): CartridgeToolApi => {
    const definition: ToolDefinition = {
        name: 'cartridge_move',
        description: 'Move or rename a cartridge to a new path. Generates a new ID. Supports cross-scope moves.',
        inputSchema: {
            source: z.string().describe('Source cartridge ID (e.g., "crt001") or path (e.g., "auth/jwt-setup")'),
            destination: z.string().describe('Destination path (not ID) for the cartridge'),
            sourceScope: z.enum(['project', 'shared']).optional().describe('Optional. Source scope. Auto-resolves if omitted.'),
            destinationScope: z.enum(['project', 'shared']).optional().describe('Optional. Destination scope. Defaults to source scope if omitted.')
        }
    };

    const handler: ToolHandler = async (args) => {
        const { source, destination, sourceScope, destinationScope } = args;

        // Read source cartridge
        const isId = CartridgeAddressResolver.isCartridgeId(source);
        const sourceAddress = isId
            ? { kind: 'id' as const, scope: sourceScope as 'project' | 'shared' | undefined, id: source }
            : { kind: 'path' as const, scope: sourceScope as 'project' | 'shared' | undefined, path: source };

        const sourceCart = await services.cartridgeService.read(sourceAddress);

        // Determine destination scope
        const resolvedSourceScope = sourceCart.id.startsWith('scrt') ? 'shared' : 'project';
        const destScope = (destinationScope as 'project' | 'shared' | undefined) || resolvedSourceScope;
        const isCrossScope = resolvedSourceScope !== destScope;

        // Check if moving to same location
        if (sourceCart.path === destination && resolvedSourceScope === destScope) {
            throw new Error('Source and destination are identical');
        }

        // Check if destination exists
        try {
            await services.cartridgeService.read({
                kind: 'path',
                scope: destScope,
                path: destination
            });
            // If read succeeds, destination exists
            throw new Error(`Destination already exists: ${destScope} ${destination}`);
        } catch (err: any) {
            // Expected: destination doesn't exist
            const isNotFound = err.message.includes('No cartridge') ||
                               err.message.includes('not found') ||
                               err.message.includes('File or directory');
            if (!isNotFound) {
                throw err; // Unexpected error
            }
            // Otherwise, destination doesn't exist - this is good, continue
        }

        // Create at destination
        const newCart = await services.cartridgeService.create({
            address: {
                kind: 'path',
                path: destination,
                scope: destScope
            },
            content: sourceCart.content
        });

        // Delete source
        await services.cartridgeService.deleteLatest(
            sourceAddress,
            sourceCart.hash
        );

        // Build response
        const result = {
            oldId: sourceCart.id,
            newId: newCart.id,
            oldPath: sourceCart.path,
            newPath: destination,
            oldScope: resolvedSourceScope,
            newScope: destScope,
            message: isCrossScope
                ? `Moved cartridge across scopes from ${resolvedSourceScope} ${sourceCart.path} (${sourceCart.id}) to ${destScope} ${destination} (new ID: ${newCart.id})`
                : `Moved cartridge from ${sourceCart.path} (${sourceCart.id}) to ${destination} (new ID: ${newCart.id})`
        };

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                }
            ]
        };
    };

    return Object.freeze({
        definition,
        handler
    });
};

const CartridgeMoveTool = Object.freeze({
    create
});

export default CartridgeMoveTool;
export type { CartridgeToolApi };
