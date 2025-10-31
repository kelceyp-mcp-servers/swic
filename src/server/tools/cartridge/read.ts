import { z } from 'zod';
import type { CoreServices } from '../../../core/Core.js';
import type { CartridgeToolApi, ToolDefinition, ToolHandler, ToolResponse } from './shared/types.js';
import { parseIdentifiers } from './shared/validators.js';
import CartridgeAddressResolver from '../../../core/utils/CartridgeAddressResolver.js';

/**
 * Creates the 'cartridge_read' MCP tool
 * Reads one or more cartridges by ID or path
 * Supports bulk operations with array input
 *
 * @param services - Core services including cartridgeService
 * @returns CartridgeToolApi with definition and handler
 */
const create = (services: CoreServices): CartridgeToolApi => {
    const definition: ToolDefinition = {
        name: 'cartridge_read',
        description: 'Read one or more cartridges by ID or path. Returns content with optional metadata. Supports bulk operations by passing an array of identifiers.',
        inputSchema: {
            identifier: z.union([
                z.string().describe('Single cartridge ID (e.g., "crt001") or path (e.g., "auth/jwt-setup")'),
                z.array(z.string()).describe('Array of cartridge IDs or paths for bulk read')
            ]).describe('Cartridge identifier(s) - ID or path, single or array'),
            scope: z.enum(['project', 'shared']).optional().describe('Optional scope. If omitted, auto-resolves (checks project first, then shared, or infers from ID prefix)'),
            includeMetadata: z.boolean().optional().default(false).describe('Include ID, path, and hash metadata header for each cartridge')
        }
    };

    const handler: ToolHandler = async (args) => {
        const { identifier, scope, includeMetadata } = args;

        // Parse identifiers (handles both single and array)
        const identifiers = parseIdentifiers(identifier);

        // Read all cartridges in parallel
        const cartridges = await Promise.all(
            identifiers.map(async (id) => {
                const isId = CartridgeAddressResolver.isCartridgeId(id);
                return await services.cartridgeService.read(
                    isId
                        ? { kind: 'id', scope: scope as 'project' | 'shared' | undefined, id }
                        : { kind: 'path', scope: scope as 'project' | 'shared' | undefined, path: id }
                );
            })
        );

        // Build output
        const parts: string[] = [];

        for (let i = 0; i < cartridges.length; i++) {
            const cartridge = cartridges[i];

            // Add metadata header if requested
            if (includeMetadata) {
                parts.push(`ID: ${cartridge.id}`);
                parts.push(`Path: ${cartridge.path}`);
                parts.push(`Hash: ${cartridge.hash}`);
                parts.push('---');
            }

            // Add content
            let content = cartridge.content;

            // Ensure trailing newline
            if (!content.endsWith('\n')) {
                content += '\n';
            }

            parts.push(content);

            // Add empty line separator between cartridges (but not after last one)
            if (i < cartridges.length - 1) {
                parts.push('');
            }
        }

        const output = parts.join('\n');

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

const CartridgeReadTool = Object.freeze({
    create
});

export default CartridgeReadTool;
export type { CartridgeToolApi };
