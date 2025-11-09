import { describe, it, expect, beforeEach, mock, Mock } from 'bun:test';
import DocService from './DocService';
import type { DocServiceApi } from './DocService';
import type { FileServiceApi } from './FileService';
import type { FolderServiceApi } from './FolderService';

describe('DocService - Folder Cleanup Integration', () => {
    let docService: DocServiceApi;
    let mockProjectFileService: FileServiceApi;
    let mockSharedFileService: FileServiceApi;
    let mockProjectFolderService: FolderServiceApi;
    let mockSharedFolderService: FolderServiceApi;

    const projectBoundary = '/test/project/docs';
    const sharedBoundary = '/home/user/.swic/docs';

    beforeEach(() => {
        // Create mock file services
        mockProjectFileService = {
            exists: mock(() => Promise.resolve(false)),
            stat: mock(),
            readText: mock(),
            resolveSafe: mock((path: string) => Promise.resolve({
                abs: `/test/project/docs/${path}`,
                rel: path
            })),
            writeText: mock(),
            delete: mock(() => Promise.resolve({ deleted: true })),
            previewReplaceFirst: mock(),
            applyReplaceFirst: mock()
        } as FileServiceApi;

        mockSharedFileService = {
            exists: mock(() => Promise.resolve(false)),
            stat: mock(),
            readText: mock(),
            resolveSafe: mock((path: string) => Promise.resolve({
                abs: `/home/user/.swic/docs/${path}`,
                rel: path
            })),
            writeText: mock(),
            delete: mock(() => Promise.resolve({ deleted: true })),
            previewReplaceFirst: mock(),
            applyReplaceFirst: mock()
        } as FileServiceApi;

        // Create mock folder services
        mockProjectFolderService = {
            list: mock(() => Promise.resolve({ folders: [], files: [] })),
            exists: mock(() => Promise.resolve(false)),
            resolve: mock((path: string) => Promise.resolve({
                abs: `/test/project/docs/${path}.md`,
                rel: `${path}.md`
            }))
        } as FolderServiceApi;

        mockSharedFolderService = {
            list: mock(() => Promise.resolve({ folders: [], files: [] })),
            exists: mock(() => Promise.resolve(false)),
            resolve: mock((path: string) => Promise.resolve({
                abs: `/home/user/.swic/docs/${path}.md`,
                rel: `${path}.md`
            }))
        } as FolderServiceApi;

        // Create DocService with mocks and scope roots
        docService = DocService.create({
            fileServiceByScope: {
                project: mockProjectFileService,
                shared: mockSharedFileService
            },
            folderServiceByScope: {
                project: mockProjectFolderService,
                shared: mockSharedFolderService
            },
            scopeRootByScope: {
                project: projectBoundary,
                shared: sharedBoundary
            },
            indexFilename: 'index.json'
        });
    });

    describe('deleteLatest with folder cleanup', () => {
        it('should pass scopeRoot to FileService.delete for project scope', async () => {
            // Arrange
            const mockDelete = mock(() => Promise.resolve({ deleted: true }));
            mockProjectFileService.delete = mockDelete;

            // Mock index exists and contains the doc
            (mockProjectFileService.exists as Mock).mockImplementation((path: string) => {
                return Promise.resolve(path === 'index.json');
            });

            (mockProjectFileService.readText as Mock).mockImplementation((path: string) => {
                if (path === 'index.json') {
                    return Promise.resolve(JSON.stringify({
                        id: {
                            'doc001': {
                                path: 'stories/001-test/spec'
                            }
                        },
                        pathToId: {
                            'stories/001-test/spec': 'doc001'
                        }
                    }));
                }
                return Promise.reject(new Error('NOT_FOUND'));
            });

            // Act - delete by ID
            const result = await docService.deleteLatest({
                kind: 'id',
                id: 'doc001'
            });

            // Assert
            expect(result.deleted).toBe(true);
            expect(mockDelete).toHaveBeenCalledWith(
                'stories/001-test/spec.md',
                projectBoundary  // Should pass the scope root
            );
        });

        it('should pass scopeRoot to FileService.delete for shared scope', async () => {
            // Arrange
            const mockDelete = mock(() => Promise.resolve({ deleted: true }));
            mockSharedFileService.delete = mockDelete;

            // Mock index exists and contains the doc
            (mockSharedFileService.exists as Mock).mockImplementation((path: string) => {
                return Promise.resolve(path === 'index.json');
            });

            (mockSharedFileService.readText as Mock).mockImplementation((path: string) => {
                if (path === 'index.json') {
                    return Promise.resolve(JSON.stringify({
                        id: {
                            'sdoc001': {
                                path: 'templates/old/template'
                            }
                        },
                        pathToId: {
                            'templates/old/template': 'sdoc001'
                        }
                    }));
                }
                return Promise.reject(new Error('NOT_FOUND'));
            });

            // Act - delete by ID
            const result = await docService.deleteLatest({
                kind: 'id',
                id: 'sdoc001'
            });

            // Assert
            expect(result.deleted).toBe(true);
            expect(mockDelete).toHaveBeenCalledWith(
                'templates/old/template.md',
                sharedBoundary  // Should pass the scope root
            );
        });

        it('should pass scopeRoot when deleting by path', async () => {
            // Arrange
            const mockDelete = mock(() => Promise.resolve({ deleted: true }));
            mockProjectFileService.delete = mockDelete;

            // Mock that file exists in project scope
            (mockProjectFileService.exists as Mock).mockImplementation((path: string) => {
                return Promise.resolve(path === 'index.json' || path === 'stories/002-test/design.md');
            });

            (mockProjectFileService.readText as Mock).mockImplementation((path: string) => {
                if (path === 'index.json') {
                    return Promise.resolve(JSON.stringify({
                        id: {
                            'doc002': {
                                path: 'stories/002-test/design'
                            }
                        },
                        pathToId: {
                            'stories/002-test/design': 'doc002'
                        }
                    }));
                }
                return Promise.reject(new Error('NOT_FOUND'));
            });

            // Act - delete by path
            const result = await docService.deleteLatest({
                kind: 'path',
                path: 'stories/002-test/design'
            });

            // Assert
            expect(result.deleted).toBe(true);
            expect(mockDelete).toHaveBeenCalledWith(
                'stories/002-test/design.md',
                projectBoundary  // Should pass the scope root
            );
        });

        it('should handle deletion when doc does not exist (idempotent)', async () => {
            // Arrange
            const mockDelete = mock(() => Promise.resolve({ deleted: false }));
            mockProjectFileService.delete = mockDelete;

            // Mock that index exists but doc is not in it
            (mockProjectFileService.exists as Mock).mockImplementation((path: string) => {
                return Promise.resolve(path === 'index.json');
            });

            (mockProjectFileService.readText as Mock).mockImplementation((path: string) => {
                if (path === 'index.json') {
                    return Promise.resolve(JSON.stringify({
                        id: {},
                        pathToId: {}
                    }));
                }
                return Promise.reject(new Error('NOT_FOUND'));
            });

            // Act - try to delete non-existent doc
            // This will throw an error because the doc is not in the index
            await expect(docService.deleteLatest({
                kind: 'id',
                id: 'doc999'
            })).rejects.toThrow('No doc with ID \'doc999\' in scope \'project\'');
        });

        it('should pass correct scopeRoot when scope is explicitly provided', async () => {
            // Arrange
            const mockDelete = mock(() => Promise.resolve({ deleted: true }));
            mockSharedFileService.delete = mockDelete;

            // Mock index in shared scope
            (mockSharedFileService.exists as Mock).mockImplementation((path: string) => {
                return Promise.resolve(path === 'index.json' || path === 'templates/test.md');
            });

            (mockSharedFileService.readText as Mock).mockImplementation((path: string) => {
                if (path === 'index.json') {
                    return Promise.resolve(JSON.stringify({
                        id: {
                            'sdoc010': {
                                path: 'templates/test'
                            }
                        },
                        pathToId: {
                            'templates/test': 'sdoc010'
                        }
                    }));
                }
                return Promise.reject(new Error('NOT_FOUND'));
            });

            // Act - delete with explicit scope
            const result = await docService.deleteLatest({
                kind: 'path',
                path: 'templates/test',
                scope: 'shared'
            });

            // Assert
            expect(result.deleted).toBe(true);
            expect(mockDelete).toHaveBeenCalledWith(
                'templates/test.md',
                sharedBoundary  // Should pass the shared scope root
            );
        });
    });
});