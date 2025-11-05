import { z } from 'zod';
import type { CoreServices } from '../../../core/Core.js';
import type { DocToolApi, ToolDefinition, ToolHandler } from './shared/types.js';
import { parseIdentifiers } from './shared/validators.js';
import docAddressResolver from '../../../core/utils/DocAddressResolver.js';

/**
 * Creates the 'doc_delete' MCP tool
 * Deletes one or more docs using optimistic locking
 * Supports bulk operations with array input
 * Idempotent - does not error on already-deleted docs
 *
 * @param services - Core services including docService
 * @returns docToolApi with definition and handler
 */
const create = (services: CoreServices): DocToolApi => {
    const definition: ToolDefinition = {
        name: 'doc_delete',
        description: 'Delete one or more docs using optimistic locking. Idempotent - does not error if doc already deleted. Supports bulk operations by passing an array of identifiers.',
        inputSchema: {
            identifier: z.union([
                z.string().describe('Single doc ID (e.g., "doc001") or path (e.g., "auth/jwt-setup.md")'),
                z.array(z.string()).describe('Array of doc IDs or paths for bulk delete')
            ]).describe('doc identifier(s) - ID or path, single or array'),
            scope: z.enum(['project', 'shared']).optional().describe('Optional scope. Auto-resolves if omitted (checks project first, then shared, or infers from ID prefix)'),
            expectedHash: z.string().optional().describe('Optional. Expected hash for optimistic locking. If omitted, automatically fetches current hash for each doc.')
        }
    };

    const handler: ToolHandler = async (args) => {
        const { identifier, scope, expectedHash } = args;

        // Parse identifiers (handles both single and array)
        const identifiers = parseIdentifiers(identifier);

        // Read all docs in parallel to get hashes and verify existence
        const docs = await Promise.all(
            identifiers.map(async (id) => {
                const isId = docAddressResolver.isdocId(id);
                const address = isId
                    ? { kind: 'id' as const, scope: scope as 'project' | 'shared' | undefined, id }
                    : { kind: 'path' as const, scope: scope as 'project' | 'shared' | undefined, path: id };

                const doc = await services.DocService.read(address);
                return {
                    identifier: id,
                    address,
                    doc
                };
            })
        );

        // Delete phase: delete all docs sequentially
        const results: Array<{ id: string; deleted: boolean }> = [];

        for (const item of docs) {
            const hash = expectedHash || item.doc.hash;

            const result = await services.DocService.deleteLatest(
                item.address,
                hash
            );

            results.push({
                id: item.doc.id,
                deleted: result.deleted
            });
        }

        // Report phase: summarize results
        const deletedResults = results.filter(r => r.deleted);
        const alreadyDeletedCount = results.length - deletedResults.length;

        const summary = {
            deleted: deletedResults.map(r => r.id),
            alreadyDeleted: results.filter(r => !r.deleted).map(r => r.id),
            message: `Deleted ${deletedResults.length} doc${deletedResults.length !== 1 ? 's' : ''}` +
                     (alreadyDeletedCount > 0
                         ? `, ${alreadyDeletedCount} ${alreadyDeletedCount !== 1 ? 'were' : 'was'} already deleted`
                         : '')
        };

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(summary, null, 2)
                }
            ]
        };
    };

    return Object.freeze({
        definition,
        handler
    });
};

const docDeleteTool = Object.freeze({
    create
});

export default docDeleteTool;
export type { DocToolApi };
