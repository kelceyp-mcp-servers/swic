import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import Core from '../../src/core/Core';
import type { CoreServices } from '../../src/core/Core';

describe('DocService Integration - Folder Cleanup', () => {
    let tempDir: string;
    let projectDir: string;
    let sharedDir: string;
    let services: CoreServices;

    beforeEach(async () => {
        // Create temporary test directories
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'swic-cleanup-test-'));
        projectDir = path.join(tempDir, '.swic');
        sharedDir = path.join(tempDir, 'shared', '.swic');

        // Create the directories
        await fs.mkdir(projectDir, { recursive: true });
        await fs.mkdir(sharedDir, { recursive: true });

        // Initialize Core services with test directories
        services = Core.createServices({
            projectBoundaryDir: projectDir,
            sharedBoundaryDir: sharedDir
        });
    });

    afterEach(async () => {
        // Clean up temporary directories
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    describe('Document deletion with folder cleanup', () => {
        it('should remove empty folders after document deletion', async () => {
            // Create a document in nested folders
            const docPath = 'stories/001-test/spec/details';
            const content = '# Test Document\n\nThis is a test document.';

            // Create the document
            const createResult = await services.DocService.create({
                address: {
                    kind: 'path',
                    path: docPath,
                    scope: 'project'
                },
                content: content
            });

            // Verify the document was created
            expect(createResult.id).toBeDefined();
            expect(createResult.id).toMatch(/^doc\d{3,}$/);

            // Verify folders exist
            const docFolderPath = path.join(projectDir, 'docs', 'stories', '001-test', 'spec');
            const folderExists = await fs.access(docFolderPath).then(() => true).catch(() => false);
            expect(folderExists).toBe(true);

            // Delete the document
            const deleteResult = await services.DocService.deleteLatest({
                kind: 'id',
                id: createResult.id
            });

            expect(deleteResult.deleted).toBe(true);

            // Verify folders were removed
            const storiesFolderPath = path.join(projectDir, 'docs', 'stories');
            const storiesFolderExists = await fs.access(storiesFolderPath).then(() => true).catch(() => false);
            expect(storiesFolderExists).toBe(false);

            // Verify docs root still exists
            const docsRootPath = path.join(projectDir, 'docs');
            const docsRootExists = await fs.access(docsRootPath).then(() => true).catch(() => false);
            expect(docsRootExists).toBe(true);
        });

        it('should stop cleanup at non-empty folder', async () => {
            // Create two documents in different subfolders
            const doc1Path = 'project/module1/doc';
            const doc2Path = 'project/module2/doc';
            const content = '# Test Document';

            // Create both documents
            const result1 = await services.DocService.create({
                address: {
                    kind: 'path',
                    path: doc1Path,
                    scope: 'project'
                },
                content: content
            });

            const result2 = await services.DocService.create({
                address: {
                    kind: 'path',
                    path: doc2Path,
                    scope: 'project'
                },
                content: content
            });

            // Delete the first document
            await services.DocService.deleteLatest({
                kind: 'id',
                id: result1.id
            });

            // Verify module1 folder was removed
            const module1Path = path.join(projectDir, 'docs', 'project', 'module1');
            const module1Exists = await fs.access(module1Path).then(() => true).catch(() => false);
            expect(module1Exists).toBe(false);

            // Verify project folder still exists (contains module2)
            const projectPath = path.join(projectDir, 'docs', 'project');
            const projectExists = await fs.access(projectPath).then(() => true).catch(() => false);
            expect(projectExists).toBe(true);

            // Verify module2 folder still exists
            const module2Path = path.join(projectDir, 'docs', 'project', 'module2');
            const module2Exists = await fs.access(module2Path).then(() => true).catch(() => false);
            expect(module2Exists).toBe(true);
        });

        it('should handle cleanup for shared scope documents', async () => {
            // Create a document in shared scope
            const docPath = 'templates/old/deprecated/template';
            const content = '# Template';

            const result = await services.DocService.create({
                address: {
                    kind: 'path',
                    path: docPath,
                    scope: 'shared'
                },
                content: content
            });

            // Verify folders exist
            const folderPath = path.join(sharedDir, 'docs', 'templates', 'old', 'deprecated');
            const folderExists = await fs.access(folderPath).then(() => true).catch(() => false);
            expect(folderExists).toBe(true);

            // Delete the document
            await services.DocService.deleteLatest({
                kind: 'id',
                id: result.id
            });

            // Verify all folders were removed up to templates
            const templatesPath = path.join(sharedDir, 'docs', 'templates');
            const templatesExists = await fs.access(templatesPath).then(() => true).catch(() => false);
            expect(templatesExists).toBe(false);
        });

        it('should handle folders with hidden files', async () => {
            // Create a document
            const docPath = 'with-hidden/doc';
            const content = '# Document';

            const result = await services.DocService.create({
                address: {
                    kind: 'path',
                    path: docPath,
                    scope: 'project'
                },
                content: content
            });

            // Add hidden files to the folder
            const folderPath = path.join(projectDir, 'docs', 'with-hidden');
            await fs.writeFile(path.join(folderPath, '.DS_Store'), '');
            await fs.writeFile(path.join(folderPath, '.gitkeep'), '');

            // Delete the document
            await services.DocService.deleteLatest({
                kind: 'id',
                id: result.id
            });

            // Verify folder was removed (hidden files ignored)
            const folderExists = await fs.access(folderPath).then(() => true).catch(() => false);
            expect(folderExists).toBe(false);
        });

        it('should handle deeply nested folder hierarchies', async () => {
            // Create a document in very deep nesting
            const docPath = 'a/b/c/d/e/f/g/h/i/j/doc';
            const content = '# Deep Document';

            const result = await services.DocService.create({
                address: {
                    kind: 'path',
                    path: docPath,
                    scope: 'project'
                },
                content: content
            });

            // Verify deep folder exists
            const deepPath = path.join(projectDir, 'docs', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j');
            const deepExists = await fs.access(deepPath).then(() => true).catch(() => false);
            expect(deepExists).toBe(true);

            // Delete the document
            await services.DocService.deleteLatest({
                kind: 'id',
                id: result.id
            });

            // Verify entire hierarchy was removed
            const aPath = path.join(projectDir, 'docs', 'a');
            const aExists = await fs.access(aPath).then(() => true).catch(() => false);
            expect(aExists).toBe(false);
        });
    });
});