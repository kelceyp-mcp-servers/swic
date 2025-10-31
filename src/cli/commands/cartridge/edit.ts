import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';
import CartridgeAddressResolver from '../../../core/utils/CartridgeAddressResolver.js';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Creates the 'edit' command for the cartridge CLI group.
 * Edits a cartridge using text replacement or interactive editor.
 * Scope is optional - checks project first, then shared (or inferred from ID).
 *
 * @param services - Core services including cartridgeService
 * @returns Built CLI command
 */
const create = (services: CoreServices) => {
    return createCommand('edit')
        .summary('Edit a cartridge (auto-resolves scope)')
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
            .validate((value) => {
                if (value && value !== 'project' && value !== 'shared') {
                    return 'Scope must be "project" or "shared"';
                }
                return true;
            })
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
            .validate((value) => {
                if (value && !['once', 'all', 'regex'].includes(value)) {
                    return 'Mode must be one of: once, all, regex';
                }
                return true;
            })
        )
        .param((p) => p
            .name('hash')
            .type('string')
            .flag('hash', 'h')
        )
        .run(async (ctx) => {
            const { identifier, scope, interactive, old, new: newText, mode, hash } = ctx.params;

            // Auto-detect if identifier is an ID or path using new resolver
            const isId = CartridgeAddressResolver.isCartridgeId(identifier);

            // Read cartridge to get current content and hash
            const cartridge = await services.cartridgeService.read(
                isId
                    ? { kind: 'id', scope: scope as 'project' | 'shared' | undefined, id: identifier }
                    : { kind: 'path', scope: scope as 'project' | 'shared' | undefined, path: identifier }
            );

            const baseHash = hash || cartridge.hash;
            let edits: Array<any> = [];

            if (interactive) {
                // Interactive mode: open in editor
                const editor = process.env.EDITOR || 'vi';
                const tmpFile = join(tmpdir(), `cartridge-edit-${Date.now()}.md`);

                try {
                    // Write current content to temp file
                    writeFileSync(tmpFile, cartridge.content);

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
                // Replace mode: require old and new flags
                if (!old || newText === undefined) {
                    throw new Error('Replace mode requires --old and --new flags');
                }

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
            const result = await services.cartridgeService.editLatest(
                (isId
                    ? { kind: 'id', scope: scope as 'project' | 'shared' | undefined, id: identifier }
                    : { kind: 'path', scope: scope as 'project' | 'shared' | undefined, path: identifier }) as any,
                baseHash,
                edits
            );

            // Output new hash
            ctx.stdio.stdout.write(`${result.newHash}\n`);
            ctx.logger.info(`Applied ${result.applied} edit(s) to cartridge: ${cartridge.id}`);
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ create });
