import { Server as MCPServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import debug from 'debug';
import packageJson from '../../package.json';
import type { CoreServices } from '../core/Core.js';
import CartridgeCreateTool from './tools/cartridge/create.js';

/**
 * Server API interface
 */
interface ServerApi {
    /** Start the MCP server on stdio transport */
    start(): Promise<void>;
}

/**
 * Server options
 */
interface ServerOptions {
    services: CoreServices;
}

/**
 * Create a Server instance
 *
 * Creates an MCP (Model Context Protocol) server that exposes tools
 * to AI assistants. The server name and version are read from package.json.
 *
 * @param options - Server configuration including core services
 * @returns Server API with start method
 * @example
 * ```typescript
 * const services = Core.createServices({...});
 * const server = Server.create({ services });
 * await server.start();
 * ```
 */
const create = (options: ServerOptions): ServerApi => {
    const { services } = options;
    const name = packageJson.name;
    const version = packageJson.version;

    const mcpServer = new MCPServer({name, version}, {capabilities: {tools: {}}});

    // Initialize tools
    const cartridgeCreateTool = CartridgeCreateTool.create(services);

    /**
     * Register available tools with the MCP server
     * @internal
     */
    const registerTools = (): void => {
        mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    cartridgeCreateTool.definition
                ]
            };
        });
    };

    /**
     * Register tool execution handlers
     * @internal
     */
    const registerToolHandlers = (): void => {
        mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name: toolName, arguments: args } = request.params;

            switch (toolName) {
                case 'cartridge_create':
                    return await cartridgeCreateTool.handler(args, services);

                default:
                    throw new Error(`Unknown tool: ${toolName}`);
            }
        });
    };

    /**
     * Start the MCP server
     *
     * Registers tools and handlers, then connects to stdio transport.
     * The server will run until the transport is closed.
     */
    const start = async (): Promise<void> => {
        registerTools();
        registerToolHandlers();
        const transport = new StdioServerTransport();
        await mcpServer.connect(transport);
        console.error(`${name} v${version} running on stdio`);
    };

    return Object.freeze({
        start
    });
};

/**
 * Main entry point for the server
 *
 * Creates and starts the MCP server when run directly.
 * @internal
 */
const main = async (): Promise<void> => {
    const { default: Core } = await import('../core/Core.js');
    const { default: FindProjectRoot } = await import('../core/utils/findProjectRoot.js');
    const { resolve } = await import('path');
    const { homedir } = await import('os');

    const projectBoundaryDir = FindProjectRoot.findProjectRoot();
    const sharedBoundaryDir = resolve(homedir(), '.swic');

    const services = Core.createServices({
        projectBoundaryDir,
        sharedBoundaryDir
    });

    const server = create({ services });
    await server.start();
};

/**
 * Server module for SWIC MCP server
 *
 * Provides the MCP (Model Context Protocol) server that exposes
 * SWIC functionality as tools to AI assistants like Claude.
 *
 * @module Server
 */
const Server = Object.freeze({
    create
});

// Run if this is the main module
if (import.meta.main) {
    main().catch(console.error);
}

export default Server;
export type { ServerApi, ServerOptions };