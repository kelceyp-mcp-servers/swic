import { z } from 'zod';
import type { CoreServices } from '../../../core/Core.js';
import type { CartridgeToolApi, ToolDefinition, ToolHandler, ToolResponse } from './shared/types.js';

/**
 * Creates the cartridge_create MCP tool
 *
 * Provides an MCP tool for creating new cartridges with content.
 * Supports both project and shared scopes.
 *
 * @param services - Core services including cartridgeService
 * @returns Frozen tool API with definition and handler
 */
const create = (services: CoreServices): CartridgeToolApi => {
    const definition: ToolDefinition = {
        name: 'cartridge_create',
        description: 'Create a new cartridge with content. Returns the created cartridge ID.',
        inputSchema: {
            scope: z.enum(['project', 'shared']).describe('Scope for the cartridge (project or shared)'),
            path: z.string().describe('Path for the cartridge (e.g., "auth/jwt-setup" or "auth/jwt-setup.md")'),
            content: z.string().describe('Content of the cartridge')
        }
    };

    const handler: ToolHandler = async (args) => {
        const { scope, path, content } = args;

        // Create the cartridge
        const result = await services.cartridgeService.create({
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
                    text: `Created cartridge: ${result.id} at ${result.path}`
                }
            ]
        };
    };

    return Object.freeze({
        definition,
        handler
    });
};

/**
 * Cartridge create tool module
 *
 * Provides MCP tool for creating cartridges through the Model Context Protocol.
 *
 * @module tools/cartridge/create
 */
const CartridgeCreateTool = Object.freeze({
    create
});

export default CartridgeCreateTool;
export type { CartridgeToolApi };
