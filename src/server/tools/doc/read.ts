import { z } from 'zod';
import type { CoreServices } from '../../../core/Core.js';
import type { DocToolApi, ToolDefinition, ToolHandler } from './shared/types.js';
import { parseIdentifiers } from './shared/validators.js';
import docAddressResolver from '../../../core/utils/docAddressResolver.js';

/**
 * Creates the 'doc_read' MCP tool
 * Reads one or more docs by ID or path
 * Supports bulk operations with array input
 *
 * @param services - Core services including docService
 * @returns docToolApi with definition and handler
 */
const create = (services: CoreServices): DocToolApi => {
    const definition: ToolDefinition = {
        name: 'doc_read',
        description: 'Read one or more docs by ID or path. Returns content with optional metadata. Supports bulk operations by passing an array of identifiers.',
        inputSchema: {
            identifier: z.union([
                z.string().describe('Single doc ID (e.g., "doc001") or path (e.g., "auth/jwt-setup")'),
                z.array(z.string()).describe('Array of doc IDs or paths for bulk read')
            ]).describe('doc identifier(s) - ID or path, single or array'),
            scope: z.enum(['project', 'shared']).optional().describe('Optional scope. If omitted, auto-resolves (checks project first, then shared, or infers from ID prefix)'),
            includeMetadata: z.boolean().optional().default(false).describe('Include ID, path, and hash metadata header for each doc')
        }
    };

    const handler: ToolHandler = async (args) => {
        const { identifier, scope, includeMetadata } = args;

        // Parse identifiers (handles both single and array)
        const identifiers = parseIdentifiers(identifier);

        // Read all docs in parallel
        const docs = await Promise.all(
            identifiers.map(async (id) => {
                const isId = docAddressResolver.isdocId(id);
                return await services.DocService.read(
                    isId
                        ? { kind: 'id', scope: scope as 'project' | 'shared' | undefined, id }
                        : { kind: 'path', scope: scope as 'project' | 'shared' | undefined, path: id }
                );
            })
        );

        // Build output
        const parts: string[] = [];

        for (let i = 0; i < docs.length; i++) {
            const doc = docs[i];

            // Add metadata header if requested
            if (includeMetadata) {
                parts.push(`ID: ${doc.id}`);
                parts.push(`Path: ${doc.path}`);
                parts.push(`Hash: ${doc.hash}`);
                parts.push('---');
            }

            // Add content
            let content = doc.content;

            // Ensure trailing newline
            if (!content.endsWith('\n')) {
                content += '\n';
            }

            parts.push(content);

            // Add empty line separator between docs (but not after last one)
            if (i < docs.length - 1) {
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

const docReadTool = Object.freeze({
    create
});

export default docReadTool;
export type { DocToolApi };
