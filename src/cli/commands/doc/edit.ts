import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';
import docAddressResolver from '../../../core/utils/DocAddressResolver.js';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Creates the 'edit' command for the doc CLI group.
 * Edits a doc using text replacement or interactive editor.
 * Scope is optional - checks project first, then shared (or inferred from ID).
 *
 * @param services - Core services including docService
 * @returns Built CLI command
 */
const create = (services: CoreServices) => {
    return createCommand('edit')
        .summary('Edit a doc (auto-resolves scope)')
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
            .name('interactive')
            .type('boolean')
            .flag('interactive', 'i')
        )
        .param((p) => p
            .name('old')
            .type('string')
            .flag('old')
        )
        .param((p) => p
            .name('new')
            .type('string')
            .flag('new')
        )
        .param((p) => p
            .name('mode')
            .type('string')
            .flag('mode', 'm')
        )
        .preValidate((ctx) => {
            const { scope, mode, interactive, old, new: newText } = ctx.argv.flags;

            // Scope validation
            if (scope && scope !== 'project' && scope !== 'shared') {
                return 'Scope must be "project" or "shared"';
            }

            // Mode validation
            if (mode && !['once', 'all', 'regex'].includes(mode)) {
                return 'Mode must be one of: once, all, regex';
            }

            // Replace mode requirements when not interactive
            if (!interactive && (!old || newText === undefined)) {
                return 'Replace mode requires --old and --new flags (or use --interactive)';
            }

            return true;
        })
        .run(async (ctx) => {
            const { identifier, scope, interactive, old, new: newText, mode } = ctx.params;

            // Auto-detect if identifier is an ID or path using new resolver
            const isId = docAddressResolver.isdocId(identifier);

            // Read doc to get current content
            const doc = await services.DocService.read(
                isId
                    ? { kind: 'id', scope: scope as 'project' | 'shared' | undefined, id: identifier }
                    : { kind: 'path', scope: scope as 'project' | 'shared' | undefined, path: identifier }
            );
            let edits: Array<any> = [];

            if (interactive) {
                // Interactive mode: open in editor
                const editor = process.env.EDITOR || 'vi';
                const tmpFile = join(tmpdir(), `doc-edit-${Date.now()}.md`);

                try {
                    // Write current content to temp file
                    writeFileSync(tmpFile, doc.content);

                    // Open in editor
                    execSync(`${editor} ${tmpFile}`, { stdio: 'inherit' });

                    // Read edited content
                    const editedContent = await Bun.file(tmpFile).text();

                    // Create replaceAllContent operation
                    edits = [{ op: 'replaceAllContent', content: editedContent }];
                }
                finally {
                    // Clean up temp file
                    try {
                        unlinkSync(tmpFile);
                    }
                    catch {
                        // Ignore cleanup errors
                    }
                }
            }
            else {
                // Replace mode (validated in preValidate)
                const editMode = mode || 'all';

                if (editMode === 'once') {
                    edits = [{ op: 'replaceOnce', oldText: old, newText }];
                }
                else if (editMode === 'all') {
                    edits = [{ op: 'replaceAll', oldText: old, newText }];
                }
                else if (editMode === 'regex') {
                    // For regex mode, old is the pattern, parse flags if provided
                    const flagsMatch = old.match(/\/([gimuy]*)$/);
                    const pattern = flagsMatch ? old.slice(0, -flagsMatch[0].length) : old;
                    const flags = flagsMatch ? flagsMatch[1] : undefined;

                    edits = [{ op: 'replaceRegex', pattern, flags, replacement: newText }];
                }
            }

            // Apply edits
            const result = await services.DocService.editLatest(
                (isId
                    ? { kind: 'id', scope: scope as 'project' | 'shared' | undefined, id: identifier }
                    : { kind: 'path', scope: scope as 'project' | 'shared' | undefined, path: identifier }) as any,
                edits
            );

            ctx.logger.info(`Applied ${result.applied} edit(s) to doc: ${doc.id}`);
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ create });
