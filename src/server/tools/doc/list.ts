import { z } from 'zod';
import type { CoreServices } from '../../../core/Core.js';
import type { DocToolApi, ToolDefinition, ToolHandler } from './shared/types.js';

/**
 * Creates the 'doc_list' MCP tool
 * Lists docs with optional filtering by scope and path prefix
 * Returns structured JSON data
 *
 * @param services - Core services including docService
 * @returns docToolApi with definition and handler
 */
const create = (services: CoreServices): DocToolApi => {
    const definition: ToolDefinition = {
        name: 'doc_list',
        description: 'List docs with optional filtering. Returns structured JSON with doc metadata. When no scope specified, lists from both scopes with override detection.',
        inputSchema: {
            scope: z.enum(['project', 'shared']).optional().describe('Optional scope filter. If omitted, lists from both scopes and detects overrides (project docs that shadow shared ones)'),
            pathPrefix: z.string().optional().describe('Optional path prefix filter (e.g., "auth/" to list only docs in auth namespace)'),
            includeContent: z.boolean().optional().default(false).describe('Include synopsis from front matter in results')
        }
    };

    const handler: ToolHandler = async (args) => {
        const { scope, pathPrefix, includeContent } = args;

        // List docs
        const items = await services.DocService.list({
            scope: scope as 'project' | 'shared' | undefined,
            pathPrefix: pathPrefix as string | undefined,
            includeContent: includeContent === true
        });

        // If listing both scopes, detect overrides
        let docs;
        if (!scope) {
            // Separate by scope
            const projectItems = items.filter(item => item.id.startsWith('doc'));
            const sharedItems = items.filter(item => item.id.startsWith('sdoc'));

            // Build path sets for override detection
            const projectPaths = new Set(projectItems.map(item => item.path));
            const sharedPaths = new Set(sharedItems.map(item => item.path));

            // Map items with override status
            docs = items.map(item => {
                const isProject = item.id.startsWith('doc');
                let override: string | undefined;

                if (isProject && sharedPaths.has(item.path)) {
                    override = 'overrides';
                }
                else if (!isProject && projectPaths.has(item.path)) {
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
        }
        else {
            // Single scope - no override detection needed
            docs = items.map(item => ({
                id: item.id,
                path: item.path,
                scope: item.id.startsWith('doc') ? 'project' : 'shared',
                synopsis: item.synopsis,
                modifiedAt: item.modifiedAt
            }));
        }

        // Sort by path alphabetically
        docs.sort((a, b) => a.path.localeCompare(b.path));

        // Build result
        const result = {
            docs,
            count: docs.length
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

const docListTool = Object.freeze({
    create
});

export default docListTool;
export type { DocToolApi };
