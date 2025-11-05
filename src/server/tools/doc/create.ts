import { z } from 'zod';
import type { CoreServices } from '../../../core/Core.js';
import type { DocToolApi, ToolDefinition, ToolHandler } from './shared/types.js';

/**
 * Creates the doc_create MCP tool
 *
 * Provides an MCP tool for creating new docs with content.
 * Supports both project and shared scopes.
 *
 * @param services - Core services including docService
 * @returns Frozen tool API with definition and handler
 */
const create = (services: CoreServices): DocToolApi => {
    const definition: ToolDefinition = {
        name: 'doc_create',
        description: 'Create a new doc with content. Returns the created doc ID.',
        inputSchema: {
            scope: z.enum(['project', 'shared']).describe('Scope for the doc (project or shared)'),
            path: z.string().describe('Path for the doc (e.g., "auth/jwt-setup.md")'),
            content: z.string().describe('Content of the doc')
        }
    };

    const handler: ToolHandler = async (args) => {
        const { scope, path, content } = args;

        // Create the doc
        const result = await services.DocService.create({
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
                    text: `Created doc: ${result.id} at ${result.path}`
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
 * doc create tool module
 *
 * Provides MCP tool for creating docs through the Model Context Protocol.
 *
 * @module tools/doc/create
 */
const docCreateTool = Object.freeze({
    create
});

export default docCreateTool;
export type { DocToolApi };
