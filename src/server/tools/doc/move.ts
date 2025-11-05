import { z } from 'zod';
import type { CoreServices } from '../../../core/Core.js';
import type { DocToolApi, ToolDefinition, ToolHandler } from './shared/types.js';
import docAddressResolver from '../../../core/utils/DocAddressResolver.js';

/**
 * Creates the 'doc_move' MCP tool
 * Moves or renames a doc to a new path
 * Generates a new ID (even for same-scope moves)
 * Supports cross-scope moves with explicit destinationScope parameter
 *
 * @param services - Core services including docService
 * @returns docToolApi with definition and handler
 */
const create = (services: CoreServices): DocToolApi => {
    const definition: ToolDefinition = {
        name: 'doc_move',
        description: 'Move or rename a doc to a new path. Generates a new ID. Supports cross-scope moves.',
        inputSchema: {
            source: z.string().describe('Source doc ID (e.g., "doc001") or path (e.g., "auth/jwt-setup")'),
            destination: z.string().describe('Destination path (not ID) for the doc'),
            sourceScope: z.enum(['project', 'shared']).optional().describe('Optional. Source scope. Auto-resolves if omitted.'),
            destinationScope: z.enum(['project', 'shared']).optional().describe('Optional. Destination scope. Defaults to source scope if omitted.')
        }
    };

    const handler: ToolHandler = async (args) => {
        const { source, destination, sourceScope, destinationScope } = args;

        // Read source doc
        const isId = docAddressResolver.isdocId(source);
        const sourceAddress = isId
            ? { kind: 'id' as const, scope: sourceScope as 'project' | 'shared' | undefined, id: source }
            : { kind: 'path' as const, scope: sourceScope as 'project' | 'shared' | undefined, path: source };

        const sourceCart = await services.DocService.read(sourceAddress);

        // Determine destination scope
        const resolvedSourceScope = sourceCart.id.startsWith('sdoc') ? 'shared' : 'project';
        const destScope = (destinationScope as 'project' | 'shared' | undefined) || resolvedSourceScope;
        const isCrossScope = resolvedSourceScope !== destScope;

        // Check if moving to same location
        if (sourceCart.path === destination && resolvedSourceScope === destScope) {
            throw new Error('Source and destination are identical');
        }

        // Check if destination exists
        try {
            await services.DocService.read({
                kind: 'path',
                scope: destScope,
                path: destination
            });
            // If read succeeds, destination exists
            throw new Error(`Destination already exists: ${destScope} ${destination}`);
        }
        catch (err: any) {
            // Expected: destination doesn't exist
            const isNotFound = err.message.includes('No doc') ||
                               err.message.includes('not found') ||
                               err.message.includes('File or directory');
            if (!isNotFound) {
                throw err; // Unexpected error
            }
            // Otherwise, destination doesn't exist - this is good, continue
        }

        // Create at destination
        const newCart = await services.DocService.create({
            address: {
                kind: 'path',
                path: destination,
                scope: destScope
            },
            content: sourceCart.content
        });

        // Delete source
        await services.DocService.deleteLatest(
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
                ? `Moved doc across scopes from ${resolvedSourceScope} ${sourceCart.path} (${sourceCart.id}) to ${destScope} ${destination} (new ID: ${newCart.id})`
                : `Moved doc from ${sourceCart.path} (${sourceCart.id}) to ${destination} (new ID: ${newCart.id})`
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

const docMoveTool = Object.freeze({
    create
});

export default docMoveTool;
export type { DocToolApi };
