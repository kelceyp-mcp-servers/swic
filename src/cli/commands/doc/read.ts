import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';
import docAddressResolver from '../../../core/utils/DocAddressResolver.js';

/**
 * Creates the 'read' command for the doc CLI group.
 * Reads and outputs one or more docs' content.
 * Accepts comma-separated identifiers (e.g., "doc001,doc002,doc003").
 * Multiple docs are separated by empty lines in output.
 * Scope is optional - checks project first, then shared (or inferred from ID).
 *
 * @param services - Core services including docService
 * @returns Built CLI command
 */
const create = (services: CoreServices) => {
    return createCommand('read')
        .summary('Read doc(s) - comma-separated (auto-resolves scope)')
        .param((p) => p
            .name('identifier')
            .type('string')
            .positional(0)
            .required()
        )
        .param((p) => p
            .name('scope')
            .type('string')
            .flag('scope', 's')
        )
        .param((p) => p
            .name('meta')
            .type('boolean')
            .flag('meta', 'm')
        )
        .preValidate((ctx) => {
            if (ctx.argv.flags.scope &&
                ctx.argv.flags.scope !== 'project' &&
                ctx.argv.flags.scope !== 'shared') {
                return 'Scope must be "project" or "shared"';
            }
            return true;
        })
        .run(async (ctx) => {
            const { identifier, scope, meta } = ctx.params;

            // Parse comma-separated identifiers and deduplicate
            const identifiers = identifier.includes(',')
                ? [...new Set(identifier.split(',').map(id => id.trim()).filter(Boolean))]
                : [identifier];

            // Handle empty result after parsing
            if (identifiers.length === 0) {
                throw new Error('No identifiers provided');
            }

            // Validation phase: basic format check
            for (const id of identifiers) {
                if (!id || id.length === 0) {
                    throw new Error('Invalid identifier: empty string');
                }
            }

            // Read phase: read all docs in parallel
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

            // Output phase: write each doc with empty line separator
            for (let i = 0; i < docs.length; i++) {
                const doc = docs[i];

                // If meta flag is set, output metadata first
                if (meta) {
                    ctx.stdio.stdout.write(`ID: ${doc.id}\n`);
                    ctx.stdio.stdout.write(`Path: ${doc.path}\n`);
                    ctx.stdio.stdout.write(`Hash: ${doc.hash}\n`);
                    ctx.stdio.stdout.write('---\n');
                }

                // Output the content
                ctx.stdio.stdout.write(doc.content);

                // Add trailing newline if content doesn't end with one
                if (!doc.content.endsWith('\n')) {
                    ctx.stdio.stdout.write('\n');
                }

                // Add empty line separator between docs (but not after the last one)
                if (i < docs.length - 1) {
                    ctx.stdio.stdout.write('\n');
                }
            }
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ create });
