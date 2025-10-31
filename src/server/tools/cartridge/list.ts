import { z } from 'zod';
import type { CoreServices } from '../../../core/Core.js';
import type { CartridgeToolApi, ToolDefinition, ToolHandler, ToolResponse } from './shared/types.js';

/**
 * Creates the 'cartridge_list' MCP tool
 * Lists cartridges with optional filtering by scope and path prefix
 * Returns structured JSON data
 *
 * @param services - Core services including cartridgeService
 * @returns CartridgeToolApi with definition and handler
 */
const create = (services: CoreServices): CartridgeToolApi => {
    const definition: ToolDefinition = {
        name: 'cartridge_list',
        description: 'List cartridges with optional filtering. Returns structured JSON with cartridge metadata. When no scope specified, lists from both scopes with override detection.',
        inputSchema: {
            scope: z.enum(['project', 'shared']).optional().describe('Optional scope filter. If omitted, lists from both scopes and detects overrides (project cartridges that shadow shared ones)'),
            pathPrefix: z.string().optional().describe('Optional path prefix filter (e.g., "auth/" to list only cartridges in auth namespace)'),
            includeContent: z.boolean().optional().default(false).describe('Include synopsis from front matter in results')
        }
    };

    const handler: ToolHandler = async (args) => {
        const { scope, pathPrefix, includeContent } = args;

        // List cartridges
        const items = await services.cartridgeService.list({
            scope: scope as 'project' | 'shared' | undefined,
            pathPrefix: pathPrefix as string | undefined,
            includeContent: includeContent === true
        });

        // If listing both scopes, detect overrides
        let cartridges;
        if (!scope) {
            // Separate by scope
            const projectItems = items.filter(item => item.id.startsWith('crt'));
            const sharedItems = items.filter(item => item.id.startsWith('scrt'));

            // Build path sets for override detection
            const projectPaths = new Set(projectItems.map(item => item.path));
            const sharedPaths = new Set(sharedItems.map(item => item.path));

            // Map items with override status
            cartridges = items.map(item => {
                const isProject = item.id.startsWith('crt');
                let override: string | undefined;

                if (isProject && sharedPaths.has(item.path)) {
                    override = 'overrides';
                } else if (!isProject && projectPaths.has(item.path)) {
                    override = 'overridden';
                }

                return {
                    id: item.id,
                    path: item.path,
                    scope: isProject ? 'project' : 'shared',
                    override,
                    synopsis: item.synopsis,
                    modifiedAt: item.modifiedAt
                };
            });
        } else {
            // Single scope - no override detection needed
            cartridges = items.map(item => ({
                id: item.id,
                path: item.path,
                scope: item.id.startsWith('crt') ? 'project' : 'shared',
                synopsis: item.synopsis,
                modifiedAt: item.modifiedAt
            }));
        }

        // Sort by path alphabetically
        cartridges.sort((a, b) => a.path.localeCompare(b.path));

        // Build result
        const result = {
            cartridges,
            count: cartridges.length
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

const CartridgeListTool = Object.freeze({
    create
});

export default CartridgeListTool;
export type { CartridgeToolApi };
