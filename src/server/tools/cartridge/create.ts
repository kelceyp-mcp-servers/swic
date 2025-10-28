import type { CoreServices } from '../../../core/Core.js';

/**
 * MCP tool definition structure
 */
interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: object;
}

/**
 * Tool handler function signature
 */
interface ToolHandler {
    (args: any, services: CoreServices): Promise<ToolResponse>;
}

/**
 * MCP tool response structure
 */
interface ToolResponse {
    content: Array<{ type: 'text'; text: string }>;
}

/**
 * Cartridge create tool API
 */
interface CartridgeCreateToolApi {
    definition: ToolDefinition;
    handler: ToolHandler;
}

/**
 * Validate required string parameter
 * @internal
 */
const validateString = (value: unknown, name: string): void => {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`${name} is required and must be a non-empty string`);
    }
};

/**
 * Validate scope parameter
 * @internal
 */
const validateScope = (scope: unknown): void => {
    if (scope !== 'project' && scope !== 'shared') {
        throw new Error('scope must be "project" or "shared"');
    }
};

/**
 * Creates the cartridge_create MCP tool
 *
 * Provides an MCP tool for creating new cartridges with content.
 * Supports both project and shared scopes.
 *
 * @param services - Core services including cartridgeService
 * @returns Frozen tool API with definition and handler
 */
const create = (services: CoreServices): CartridgeCreateToolApi => {
    const definition: ToolDefinition = {
        name: 'cartridge_create',
        description: 'Create a new cartridge with content. Returns the created cartridge ID.',
        inputSchema: {
            type: 'object',
            properties: {
                scope: {
                    type: 'string',
                    description: 'Scope for the cartridge (project or shared)',
                    enum: ['project', 'shared']
                },
                path: {
                    type: 'string',
                    description: 'Path for the cartridge (e.g., "auth/jwt-setup" or "auth/jwt-setup.md")'
                },
                content: {
                    type: 'string',
                    description: 'Content of the cartridge'
                }
            },
            required: ['scope', 'path', 'content']
        }
    };

    const handler: ToolHandler = async (args) => {
        // Validate required parameters
        validateScope(args?.scope);
        validateString(args?.path, 'path');
        validateString(args?.content, 'content');

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
export type { CartridgeCreateToolApi, ToolDefinition, ToolHandler, ToolResponse };
