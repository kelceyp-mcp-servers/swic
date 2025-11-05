import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import packageJson from '../../package.json';
import type { CoreServices } from '../core/Core.js';
import { toolFactories } from './tools/index.js';

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

    const server = new McpServer({ name, version });

    /**
     * Start the MCP server
     *
     * Registers all tools using the high-level SDK API,
     * then connects to stdio transport.
     * The server will run until the transport is closed.
     */
    const start = async (): Promise<void> => {
        // Register all tools from the tool registry
        for (const makeToolFn of toolFactories) {
            const tool = makeToolFn(services);

            server.registerTool(
                tool.definition.name,
                {
                    description: tool.definition.description,
                    inputSchema: tool.definition.inputSchema
                },
                async (args) => tool.handler(args)
            );
        }

        const transport = new StdioServerTransport();
        await server.connect(transport);
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

    const { projectDataDir, sharedDataDir } = Core.lazilyGetDataDirs();

    const services = Core.createServices({
        projectBoundaryDir: projectDataDir,
        sharedBoundaryDir: sharedDataDir
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
// Bun uses import.meta.main, Node.js needs canonical path comparison
import { pathToFileURL, fileURLToPath } from 'url';
import { realpathSync } from 'fs';
const isMain = import.meta.main ?? (() => {
    try {
        const scriptPath = realpathSync(fileURLToPath(import.meta.url));
        const argPath = realpathSync(process.argv[1]);
        return scriptPath === argPath;
    } catch {
        return false;
    }
})();
if (isMain) {
    main().catch(console.error);
}

export default Server;
export type { ServerApi, ServerOptions };