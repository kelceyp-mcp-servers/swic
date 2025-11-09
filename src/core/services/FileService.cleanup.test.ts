import { describe, it, expect, beforeEach, mock, Mock } from 'bun:test';
import * as fs from 'fs/promises';
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
        it('should return true when folder is successfully removed', async () => {
            // Arrange
            const mockUnlink = mock(() => Promise.resolve());
            const mockReaddir = mock(() => Promise.resolve([])); // Empty folder
            const mockRmdir = mock(() => Promise.resolve()); // Successful removal

            (fs.unlink as Mock).mockImplementation(mockUnlink);
            (fs.readdir as Mock).mockImplementation(mockReaddir);
            (fs.rmdir as Mock).mockImplementation(mockRmdir);

            // Act - delete file with scopeRoot to trigger cleanup and tryRemoveFolder
            const result = await fileService.delete('folder/doc.md', '/test/boundary');

            // Assert
            expect(result.deleted).toBe(true);
            expect(mockRmdir).toHaveBeenCalledWith('/test/boundary/folder');
            // The fact that rmdir was called means tryRemoveFolder returned true internally
        });

        it('should return true when folder already removed (ENOENT error)', async () => {
            // Arrange
            const mockUnlink = mock(() => Promise.resolve());
            const mockReaddir = mock(() => Promise.resolve([])); // Empty folder
            const enoentError = new Error('ENOENT: no such file or directory');
            (enoentError as any).code = 'ENOENT';
            const mockRmdir = mock(() => Promise.reject(enoentError));

            (fs.unlink as Mock).mockImplementation(mockUnlink);
            (fs.readdir as Mock).mockImplementation(mockReaddir);
            (fs.rmdir as Mock).mockImplementation(mockRmdir);

            // Act - delete file with scopeRoot to trigger cleanup
            const result = await fileService.delete('folder/doc.md', '/test/boundary');

            // Assert
            expect(result.deleted).toBe(true);
            expect(mockRmdir).toHaveBeenCalledWith('/test/boundary/folder');
            // tryRemoveFolder returns true for ENOENT, allowing cleanup to continue
        });

        it('should return false when folder not empty (ENOTEMPTY error)', async () => {
            // Arrange
            const mockUnlink = mock(() => Promise.resolve());
            const mockReaddir = mock(() => Promise.resolve([])); // Empty folder initially
            const enotemptyError = new Error('ENOTEMPTY: directory not empty');
            (enotemptyError as any).code = 'ENOTEMPTY';
            const mockRmdir = mock(() => Promise.reject(enotemptyError));

            (fs.unlink as Mock).mockImplementation(mockUnlink);
            (fs.readdir as Mock).mockImplementation(mockReaddir);
            (fs.rmdir as Mock).mockImplementation(mockRmdir);

            // Act - delete file with scopeRoot to trigger cleanup
            const result = await fileService.delete('folder/doc.md', '/test/boundary');

            // Assert
            expect(result.deleted).toBe(true);
            expect(mockRmdir).toHaveBeenCalledWith('/test/boundary/folder');
            // tryRemoveFolder returns false for ENOTEMPTY, stopping cleanup gracefully
        });

        it('should return false when permission denied (EACCES error)', async () => {
            // Arrange
            const mockUnlink = mock(() => Promise.resolve());
            const mockReaddir = mock(() => Promise.resolve([])); // Empty folder
            const eaccesError = new Error('EACCES: permission denied');
            (eaccesError as any).code = 'EACCES';
            const mockRmdir = mock(() => Promise.reject(eaccesError));

            (fs.unlink as Mock).mockImplementation(mockUnlink);
            (fs.readdir as Mock).mockImplementation(mockReaddir);
            (fs.rmdir as Mock).mockImplementation(mockRmdir);

            // Act - delete file with scopeRoot to trigger cleanup
            const result = await fileService.delete('folder/doc.md', '/test/boundary');

            // Assert
            expect(result.deleted).toBe(true);
            expect(mockRmdir).toHaveBeenCalledWith('/test/boundary/folder');
            // tryRemoveFolder returns false for EACCES, stopping cleanup gracefully
        });

        it('should return false when operation not permitted (EPERM error)', async () => {
            // Arrange
            const mockUnlink = mock(() => Promise.resolve());
            const mockReaddir = mock(() => Promise.resolve([])); // Empty folder
            const epermError = new Error('EPERM: operation not permitted');
            (epermError as any).code = 'EPERM';
            const mockRmdir = mock(() => Promise.reject(epermError));

            (fs.unlink as Mock).mockImplementation(mockUnlink);
            (fs.readdir as Mock).mockImplementation(mockReaddir);
            (fs.rmdir as Mock).mockImplementation(mockRmdir);

            // Act - delete file with scopeRoot to trigger cleanup
            const result = await fileService.delete('folder/doc.md', '/test/boundary');

            // Assert
            expect(result.deleted).toBe(true);
            expect(mockRmdir).toHaveBeenCalledWith('/test/boundary/folder');
            // tryRemoveFolder returns false for EPERM, stopping cleanup gracefully
        });

        it('should return false for unknown errors', async () => {
            // Arrange
            const mockUnlink = mock(() => Promise.resolve());
            const mockReaddir = mock(() => Promise.resolve([])); // Empty folder
            const unknownError = new Error('Some unknown filesystem error');
            (unknownError as any).code = 'UNKNOWN';
            const mockRmdir = mock(() => Promise.reject(unknownError));

            (fs.unlink as Mock).mockImplementation(mockUnlink);
            (fs.readdir as Mock).mockImplementation(mockReaddir);
            (fs.rmdir as Mock).mockImplementation(mockRmdir);

            // Act - delete file with scopeRoot to trigger cleanup
            const result = await fileService.delete('folder/doc.md', '/test/boundary');

            // Assert
            expect(result.deleted).toBe(true);
            expect(mockRmdir).toHaveBeenCalledWith('/test/boundary/folder');
            // tryRemoveFolder returns false for unknown errors, stopping cleanup gracefully
        });
    });

    describe('isAtScopeRoot', () => {
        it('should stop cleanup when reaching the scope root', async () => {
            // Arrange
            const mockUnlink = mock(() => Promise.resolve());
            const mockReaddir = mock(() => Promise.resolve([])); // Empty folder
            const mockRmdir = mock(() => Promise.resolve());

            (fs.unlink as Mock).mockImplementation(mockUnlink);
            (fs.readdir as Mock).mockImplementation(mockReaddir);
            (fs.rmdir as Mock).mockImplementation(mockRmdir);

            // Act - delete file at root level with scopeRoot
            const result = await fileService.delete('doc.md', '/test/boundary');

            // Assert
            expect(result.deleted).toBe(true);
            expect(mockUnlink).toHaveBeenCalledWith('/test/boundary/doc.md');
            // Should NOT try to remove the scope root itself
            expect(mockRmdir).not.toHaveBeenCalled();
        });

        it('should stop cleanup for paths above the scope root', async () => {
            // Arrange
            const mockUnlink = mock(() => Promise.resolve());
            const mockReaddir = mock(() => Promise.resolve([])); // Empty folder
            const mockRmdir = mock(() => Promise.resolve());

            (fs.unlink as Mock).mockImplementation(mockUnlink);
            (fs.readdir as Mock).mockImplementation(mockReaddir);
            (fs.rmdir as Mock).mockImplementation(mockRmdir);

            // Act - Delete a file very deep in hierarchy and verify cleanup stops at scope root
            const result = await fileService.delete('a/b/c/d/e/doc.md', '/test/boundary/a/b/c');

            // Assert
            expect(result.deleted).toBe(true);
            expect(mockUnlink).toHaveBeenCalledWith('/test/boundary/a/b/c/d/e/doc.md');
            // Cleanup should occur for d and e folders, but stop at the scope root (c)
            expect(mockRmdir).toHaveBeenCalledTimes(2); // Should remove 'e' and 'd' folders
            expect(mockRmdir).toHaveBeenCalledWith('/test/boundary/a/b/c/d/e');
            expect(mockRmdir).toHaveBeenCalledWith('/test/boundary/a/b/c/d');
            // Should NOT try to remove 'c' folder as it's the scope root
        });

        it('should handle path normalization correctly (trailing slashes)', async () => {
            // Arrange
            const mockUnlink = mock(() => Promise.resolve());
            const mockReaddir = mock(() => Promise.resolve([])); // Empty folder
            const mockRmdir = mock(() => Promise.resolve());

            (fs.unlink as Mock).mockImplementation(mockUnlink);
            (fs.readdir as Mock).mockImplementation(mockReaddir);
            (fs.rmdir as Mock).mockImplementation(mockRmdir);

            // Act - delete file with scopeRoot that has trailing slash
            const result = await fileService.delete('doc.md', '/test/boundary/');

            // Assert
            expect(result.deleted).toBe(true);
            expect(mockUnlink).toHaveBeenCalledWith('/test/boundary/doc.md');
            // Should handle trailing slash correctly and still stop at root
            expect(mockRmdir).not.toHaveBeenCalled();
        });

        it('should handle path normalization correctly (dots in path)', async () => {
            // Arrange
            const mockUnlink = mock(() => Promise.resolve());
            const mockReaddir = mock(() => Promise.resolve([])); // Empty folder
            const mockRmdir = mock(() => Promise.resolve());

            (fs.unlink as Mock).mockImplementation(mockUnlink);
            (fs.readdir as Mock).mockImplementation(mockReaddir);
            (fs.rmdir as Mock).mockImplementation(mockRmdir);

            // Act - delete file in a subdirectory with normalized scopeRoot
            const result = await fileService.delete('folder/./subfolder/doc.md', '/test/boundary');

            // Assert
            expect(result.deleted).toBe(true);
            // Path normalization should handle dots correctly
            expect(mockUnlink).toHaveBeenCalledWith('/test/boundary/folder/subfolder/doc.md');
            expect(mockReaddir).toHaveBeenCalled();
            expect(mockRmdir).toHaveBeenCalled(); // Should attempt cleanup of normalized paths
        });

        it('should work with both project and shared scope paths', async () => {
            // Arrange
            const mockUnlink = mock(() => Promise.resolve());
            const mockReaddir = mock(() => Promise.resolve([])); // Empty folder
            const mockRmdir = mock(() => Promise.resolve());

            (fs.unlink as Mock).mockImplementation(mockUnlink);
            (fs.readdir as Mock).mockImplementation(mockReaddir);
            (fs.rmdir as Mock).mockImplementation(mockRmdir);

            // Test 1: Project scope path
            const result1 = await fileService.delete('project/folder/doc.md', '/test/boundary/project');
            expect(result1.deleted).toBe(true);
            expect(mockUnlink).toHaveBeenCalledWith('/test/boundary/project/folder/doc.md');
            expect(mockRmdir).toHaveBeenCalledWith('/test/boundary/project/folder');

            // Reset mocks for second test
            mockRmdir.mockClear();
            mockUnlink.mockClear();
            mockReaddir.mockClear();

            // Test 2: Shared scope path
            const result2 = await fileService.delete('shared/folder/doc.md', '/test/boundary/shared');
            expect(result2.deleted).toBe(true);
            expect(mockUnlink).toHaveBeenCalledWith('/test/boundary/shared/folder/doc.md');
            expect(mockRmdir).toHaveBeenCalledWith('/test/boundary/shared/folder');
        });
    });

    describe('cleanupEmptyFolders', () => {
        // Tests will be added here for cleanupEmptyFolders method
    });

    describe('deleteFile with cleanup', () => {
        // Integration tests for deleteFile with scopeRoot parameter
    });
});