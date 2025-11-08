import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const edit = (services: CoreServices) => {
    return createCommand('edit')
        .summary('Edit a template')
        .param((p) => p
            .name('identifier')
            .type('string')
            .positional(0)
            .required()
            .prompt('Enter template ID or path')
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
            // Scope validation
            if (ctx.argv.flags.scope &&
                ctx.argv.flags.scope !== 'project' &&
                ctx.argv.flags.scope !== 'shared') {
                return 'Scope must be "project" or "shared"';
            }

            // Mode validation
            if (ctx.argv.flags.mode &&
                !['once', 'all', 'regex'].includes(ctx.argv.flags.mode)) {
                return 'Mode must be "once", "all", or "regex"';
            }

            // Interactive OR replace mode
            if (ctx.argv.flags.interactive) {
                if (ctx.argv.flags.old || ctx.argv.flags.new || ctx.argv.flags.mode) {
                    return 'Cannot use --interactive with --old/--new/--mode';
                }
            }
            else {
                if (!ctx.argv.flags.old || !ctx.argv.flags.new) {
                    return 'Either use --interactive OR provide --old and --new';
                }
            }

            return true;
        })
        .run(async (ctx) => {
            const { identifier, scope, interactive, old, new: newText, mode } = ctx.params;

            // Detect if ID or path
            const isId = /^(tpl|stpl)\d{3,}$/.test(identifier);
            const address = isId
                ? { kind: 'id' as const, id: identifier, scope: scope as 'project' | 'shared' | undefined }
                : { kind: 'path' as const, path: identifier, scope: scope as 'project' | 'shared' | undefined };

            if (interactive) {
                // Read current content
                const result = await services.TemplateService.read(address);

                // Open in editor
                const editor = process.env.EDITOR || 'vi';
                const tmpFile = join(tmpdir(), `template-edit-${Date.now()}.md`);

                try {
                    // Write current content to temp file
                    writeFileSync(tmpFile, result.content);

                    // Open in editor
                    execSync(`${editor} ${tmpFile}`, { stdio: 'inherit' });

                    // Read edited content
                    const editedContent = await Bun.file(tmpFile).text();

                    if (editedContent === result.content) {
                        ctx.logger.info('No changes made');
                        return;
                    }

                    // Apply replaceAllContent operation
                    await services.TemplateService.edit(address, [
                        { op: 'replaceAllContent', content: editedContent }
                    ]);

                    ctx.logger.info(`Edited template: ${result.id}`);
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
                // Replace mode
                const effectiveMode = mode || 'once';
                let operation;

                if (effectiveMode === 'regex') {
                    // Extract flags from pattern if using /pattern/flags format
                    let pattern = old!;
                    let flags: string | undefined;

                    const regexMatch = pattern.match(/^\/(.+?)\/([gimsuvy]*)$/);
                    if (regexMatch) {
                        pattern = regexMatch[1];
                        flags = regexMatch[2] || undefined;
                    }

                    operation = {
                        op: 'replaceRegex' as const,
                        pattern,
                        flags,
                        replacement: newText!
                    };
                }
                else if (effectiveMode === 'all') {
                    operation = {
                        op: 'replaceAll' as const,
                        oldText: old!,
                        newText: newText!
                    };
                }
                else {
                    operation = {
                        op: 'replaceOnce' as const,
                        oldText: old!,
                        newText: newText!
                    };
                }

                const result = await services.TemplateService.edit(address, [operation]);

                if (result.applied === 0) {
                    ctx.logger.warn('No changes made (pattern not found)');
                }
                else {
                    ctx.logger.info(`Applied ${result.applied} edit operation(s)`);
                }
            }
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ edit });
