import { Server as MCPServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import debug from 'debug';
import packageJson from '../../package.json';

/**
 * Server API interface
 */
interface ServerApi {
    /** Start the MCP server on stdio transport */
    start(): Promise<void>;
}

/**
 * Create a Server instance
 *
 * Creates an MCP (Model Context Protocol) server that exposes tools
 * to AI assistants. The server name and version are read from package.json.
 *
 * @returns Server API with start method
 * @example
 * ```typescript
 * const server = Server.create();
 * await server.start();
 * ```
 */
const create = (): ServerApi => {
    const name = packageJson.name;
    const version = packageJson.version;

    const mcpServer = new MCPServer({name, version}, {capabilities: {tools: {}}});

    /**
     * Register available tools with the MCP server
     * @internal
     */
    const registerTools = (): void => {
        mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'hello',
                        description: 'Say hello with an optional name',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                    description: 'Name to greet (optional)'
                                }
                            }
                        }
                    }
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
                case 'hello': {
                    const greeting = args?.name
                        ? `Hello, ${args.name}!`
                        : 'Hello, world!';

                    return {
                        content: [
                            {
                                type: 'text',
                                text: greeting
                            }
                        ]
                    };
                }

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
    const server = create();
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
export type { ServerApi };