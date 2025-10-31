import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const create = (services: CoreServices) => {
    return createCommand('create')
        .summary('Create a new cartridge (defaults to project scope)')
        .param((p) => p
            .name('path')
            .type('string')
            .positional(0)
            .required()
            .prompt('Enter cartridge path (e.g., "auth/jwt-setup.md")')
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
            .name('content')
            .type('string')
            .flag('content', 'c')
            .stdin()
        )
        .param((p) => p
            .name('interactive')
            .type('boolean')
            .flag('interactive', 'i')
        )
        .run(async (ctx) => {
            const { path, scope, content, interactive } = ctx.params;

            let finalContent: string;

            if (interactive) {
                // Interactive mode: open editor with empty file
                const editor = process.env.EDITOR || 'vi';
                const tmpFile = join(tmpdir(), `cartridge-create-${Date.now()}.md`);

                try {
                    // Create empty temp file
                    writeFileSync(tmpFile, '');

                    // Open in editor
                    execSync(`${editor} ${tmpFile}`, { stdio: 'inherit' });

                    // Read content from temp file
                    finalContent = await Bun.file(tmpFile).text();

                    if (!finalContent || finalContent.trim().length === 0) {
                        throw new Error('Content cannot be empty');
                    }
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
                // Require content from stdin or flag
                if (!content) {
                    throw new Error('Content is required. Provide via --content, stdin, or use --interactive');
                }
                finalContent = content;
            }

            // Scope is optional, defaults to 'project' in the service
            const result = await services.cartridgeService.create({
                address: {
                    kind: 'path',
                    scope: scope as 'project' | 'shared' | undefined,
                    path
                },
                content: finalContent
            });

            const effectiveScope = scope || 'project';
            ctx.stdio.stdout.write(`${result.id}\n`);
            ctx.logger.info(`Created ${effectiveScope} cartridge: ${result.id} at ${path}`);
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ create });
