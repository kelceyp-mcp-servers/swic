import { describe, it, expect, beforeEach, mock, Mock } from 'bun:test';
import * as fs from 'fs/promises';
import * as path from 'path';
import FileService from './FileService';
import type { FileServiceApi } from './FileService';

// Mock fs.promises
mock.module('fs/promises', () => ({
    readFile: mock(),
    writeFile: mock(),
    unlink: mock(),
    stat: mock(),
    rename: mock(),
    access: mock(),
    mkdir: mock(),
    readdir: mock(),
    rmdir: mock()
}));

describe('FileService - Folder Cleanup', () => {
    let fileService: FileServiceApi;
    const boundaryDir = '/test/boundary';

    beforeEach(() => {
        // Reset all mocks
        mock.restore();
        mock.module('fs/promises', () => ({
            readFile: mock(),
            writeFile: mock(),
            unlink: mock(() => Promise.resolve()),
            stat: mock(),
            rename: mock(),
            access: mock(),
            mkdir: mock(),
            readdir: mock(),
            rmdir: mock()
        }));

        // Create FileService instance
        fileService = FileService.create({ boundaryDir });
    });

    describe('delete with cleanup - isFolderEmpty behavior', () => {
        it('should remove empty parent folder after file deletion', async () => {
            // Arrange
            const mockUnlink = mock(() => Promise.resolve());
            const mockReaddir = mock(() => Promise.resolve([])); // Empty folder
            const mockRmdir = mock(() => Promise.resolve());

            (fs.unlink as Mock).mockImplementation(mockUnlink);
            (fs.readdir as Mock).mockImplementation(mockReaddir);
            (fs.rmdir as Mock).mockImplementation(mockRmdir);

            // Act - delete file with scopeRoot to trigger cleanup
            const result = await fileService.delete('folder/doc.md', '/test/boundary');

            // Assert
            expect(result.deleted).toBe(true);
            expect(mockUnlink).toHaveBeenCalledWith('/test/boundary/folder/doc.md');
            expect(mockReaddir).toHaveBeenCalledWith('/test/boundary/folder', { withFileTypes: true });
            expect(mockRmdir).toHaveBeenCalledWith('/test/boundary/folder');
        });

        it('should NOT remove parent folder when it contains .md files', async () => {
            // Arrange
            const mockUnlink = mock(() => Promise.resolve());
            const mockReaddir = mock(() => Promise.resolve([
                {
                    name: 'other.md',
                    isFile: () => true,
                    isDirectory: () => false
                }
            ]));
            const mockRmdir = mock(() => Promise.resolve());

            (fs.unlink as Mock).mockImplementation(mockUnlink);
            (fs.readdir as Mock).mockImplementation(mockReaddir);
            (fs.rmdir as Mock).mockImplementation(mockRmdir);

            // Act - delete file with scopeRoot to trigger cleanup
            const result = await fileService.delete('folder/doc.md', '/test/boundary');

            // Assert
            expect(result.deleted).toBe(true);
            expect(mockUnlink).toHaveBeenCalledWith('/test/boundary/folder/doc.md');
            expect(mockReaddir).toHaveBeenCalledWith('/test/boundary/folder', { withFileTypes: true });
            expect(mockRmdir).not.toHaveBeenCalled(); // Should NOT try to remove folder with .md files
        });

        it('should NOT remove parent folder when it contains subdirectories', async () => {
            // Arrange
            const mockUnlink = mock(() => Promise.resolve());
            const mockReaddir = mock(() => Promise.resolve([
                {
                    name: 'subfolder',
                    isFile: () => false,
                    isDirectory: () => true
                }
            ]));
            const mockRmdir = mock(() => Promise.resolve());

            (fs.unlink as Mock).mockImplementation(mockUnlink);
            (fs.readdir as Mock).mockImplementation(mockReaddir);
            (fs.rmdir as Mock).mockImplementation(mockRmdir);

            // Act - delete file with scopeRoot to trigger cleanup
            const result = await fileService.delete('folder/doc.md', '/test/boundary');

            // Assert
            expect(result.deleted).toBe(true);
            expect(mockUnlink).toHaveBeenCalledWith('/test/boundary/folder/doc.md');
            expect(mockReaddir).toHaveBeenCalledWith('/test/boundary/folder', { withFileTypes: true });
            expect(mockRmdir).not.toHaveBeenCalled(); // Should NOT try to remove folder with subdirectories
        });

        it('should remove parent folder when it only contains hidden/non-document files', async () => {
            // Arrange
            const mockUnlink = mock(() => Promise.resolve());
            const mockReaddir = mock(() => Promise.resolve([
                {
                    name: '.DS_Store',
                    isFile: () => true,
                    isDirectory: () => false
                },
                {
                    name: '.gitkeep',
                    isFile: () => true,
                    isDirectory: () => false
                }
            ]));
            const mockRmdir = mock(() => Promise.resolve());

            (fs.unlink as Mock).mockImplementation(mockUnlink);
            (fs.readdir as Mock).mockImplementation(mockReaddir);
            (fs.rmdir as Mock).mockImplementation(mockRmdir);

            // Act - delete file with scopeRoot to trigger cleanup
            const result = await fileService.delete('folder/doc.md', '/test/boundary');

            // Assert
            expect(result.deleted).toBe(true);
            expect(mockUnlink).toHaveBeenCalledWith('/test/boundary/folder/doc.md');
            expect(mockReaddir).toHaveBeenCalledWith('/test/boundary/folder', { withFileTypes: true });
            expect(mockRmdir).toHaveBeenCalledWith('/test/boundary/folder'); // SHOULD remove folder with only hidden files
        });

        it('should NOT remove parent folder when readdir fails (cannot read folder)', async () => {
            // Arrange
            const mockUnlink = mock(() => Promise.resolve());
            const mockReaddir = mock(() => Promise.reject(new Error('EACCES: permission denied')));
            const mockRmdir = mock(() => Promise.resolve());

            (fs.unlink as Mock).mockImplementation(mockUnlink);
            (fs.readdir as Mock).mockImplementation(mockReaddir);
            (fs.rmdir as Mock).mockImplementation(mockRmdir);

            // Act - delete file with scopeRoot to trigger cleanup
            const result = await fileService.delete('folder/doc.md', '/test/boundary');

            // Assert
            expect(result.deleted).toBe(true);
            expect(mockUnlink).toHaveBeenCalledWith('/test/boundary/folder/doc.md');
            expect(mockReaddir).toHaveBeenCalledWith('/test/boundary/folder', { withFileTypes: true });
            expect(mockRmdir).not.toHaveBeenCalled(); // Should NOT try to remove when can't read folder
        });
    });

    describe('tryRemoveFolder', () => {
        // Tests will be added here for tryRemoveFolder method
    });

    describe('isAtScopeRoot', () => {
        // Tests will be added here for isAtScopeRoot method
    });

    describe('cleanupEmptyFolders', () => {
        // Tests will be added here for cleanupEmptyFolders method
    });

    describe('deleteFile with cleanup', () => {
        // Integration tests for deleteFile with scopeRoot parameter
    });
});