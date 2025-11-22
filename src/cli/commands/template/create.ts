import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const create = (services: CoreServices) => {
    return createCommand('create')
        .summary('Create a new template (defaults to project scope)')
        .description(`Creates a new template with the specified content.

Templates are reusable content patterns with parameter substitution capabilities.
They must include front matter defining parameters and can be rendered with
'swic template render'.

PARAMETERS:
  path
    Path where the template will be created
    Examples: prompts/story-init.md, workflows/deploy.md
    Must be unique within the scope

  --scope, -s
    Scope for the new template: "project" or "shared"
    Defaults to "project" if not specified
      • project: Workspace-specific templates (.swic/templates/)
      • shared: User-wide templates (~/.swic/templates/)

  --content, -c
    Template content (including front matter)
    Can also be provided via stdin

  --interactive, -i
    Open template in $EDITOR for creation
    Defaults to vi if EDITOR not set

CONTENT SOURCES (choose one):
  1. --content flag: Provide content inline
  2. stdin: Pipe or redirect content
  3. --interactive: Edit in your preferred editor

EXAMPLES:
  # Create from stdin
  cat template.md | swic template create prompts/init.md

  # Create with inline content
  swic template create prompts/hello.md --content "---
  parameters:
    name: { type: string, required: true }
  ---
  Hello {{name}}!"

  # Create interactively in editor
  swic template create workflows/deploy.md --interactive

  # Create in shared scope
  swic template create common/header.md -s shared -c "# {{title}}"`)
        .param((p) => p
            .name('path')
            .type('string')
            .positional(0)
            .required()
            .prompt('Enter template path (e.g., "prompts/story-init.md")')
        )
        .param((p) => p
            .name('scope')
            .type('string')
            .flag('scope', 's')
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
        .preValidate((ctx) => {
            // Scope validation
            if (ctx.argv.flags.scope &&
                ctx.argv.flags.scope !== 'project' &&
                ctx.argv.flags.scope !== 'shared') {
                return 'Scope must be "project" or "shared"';
            }

            // Content requirement when not interactive
            if (!ctx.argv.flags.interactive &&
                !ctx.argv.flags.content &&
                !ctx.stdin.available) {
                return 'Content required. Provide via --content, stdin, or use --interactive';
            }

            return true;
        })
        .run(async (ctx) => {
            const { path, scope, content, interactive } = ctx.params;

            let finalContent: string;

            if (interactive) {
                // Interactive mode: open editor with empty file
                const editor = process.env.EDITOR || 'vi';
                const tmpFile = join(tmpdir(), `template-create-${Date.now()}.md`);

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
                // Content from stdin or flag
                if (!content) {
                    throw new Error('Content is required. Provide via --content, stdin, or use --interactive');
                }
                finalContent = content;
            }

            // Scope is optional, defaults to 'project' in the service
            const result = await services.TemplateService.create({
                address: {
                    kind: 'path',
                    scope: scope as 'project' | 'shared' | undefined,
                    path
                },
                content: finalContent
            });

            const effectiveScope = scope || 'project';
            ctx.stdio.stdout.write(`${result.id}\n`);
            ctx.logger.info(`Created ${effectiveScope} template: ${result.id} at ${path}`);
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ create });
