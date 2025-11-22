import { createCommand } from '@kelceyp/clibuilder';
import type { CoreServices } from '../../../core/Core.js';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const create = (services: CoreServices) => {
    return createCommand('create')
        .summary('Create a new doc (defaults to project scope)')
        .description(`Creates a new documentation file with the specified content.

Docs are markdown files used for storing project knowledge, workflows, specs,
and other documentation. They support front matter for metadata and can be
organized hierarchically by path.

PARAMETERS:
  path
    Path where the doc will be created
    Examples: auth/jwt-setup.md, workflows/deploy.md, stories/001/spec.md
    Must be unique within the scope

  --scope, -s
    Scope for the new doc: "project" or "shared"
    Defaults to "project" if not specified
      • project: Workspace-specific docs (.swic/docs/)
      • shared: User-wide docs (~/.swic/docs/)

  --content, -c
    Doc content (markdown with optional front matter)
    Can also be provided via stdin

  --interactive, -i
    Open doc in $EDITOR for creation
    Defaults to vi if EDITOR not set

CONTENT SOURCES (choose one):
  1. --content flag: Provide content inline
  2. stdin: Pipe or redirect content
  3. --interactive: Edit in your preferred editor

EXAMPLES:
  # Create from stdin
  cat spec.md | swic doc create stories/042/spec.md

  # Create with inline content
  swic doc create auth/jwt.md --content "# JWT Authentication

  Implementation notes for JWT auth..."

  # Create interactively in editor
  swic doc create workflows/deploy.md --interactive

  # Create in shared scope
  swic doc create common/coding-standards.md -s shared -i`)
        .param((p) => p
            .name('path')
            .type('string')
            .positional(0)
            .required()
            .prompt('Enter doc path (e.g., "auth/jwt-setup.md")')
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
                const tmpFile = join(tmpdir(), `doc-create-${Date.now()}.md`);

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
            const result = await services.DocService.create({
                address: {
                    kind: 'path',
                    scope: scope as 'project' | 'shared' | undefined,
                    path
                },
                content: finalContent
            });

            const effectiveScope = scope || 'project';
            ctx.stdio.stdout.write(`${result.id}\n`);
            ctx.logger.info(`Created ${effectiveScope} doc: ${result.id} at ${path}`);
        })
        .onError({ exitCode: 1, showStack: 'auto' })
        .build();
};

export default Object.freeze({ create });
