import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import FileService from './services/FileService.js';
import FolderService from './services/FolderService.js';
import DocService from './services/DocService.js';
import type { DocServiceApi } from './services/DocService.js';
import FindProjectRoot from './utils/findProjectRoot.js';

interface CoreOptions {
    projectBoundaryDir: string;
    sharedBoundaryDir: string;
}

interface CoreServices {
    DocService: DocServiceApi;
}

interface DataDirs {
    projectDataDir: string;
    sharedDataDir: string;
}

// Constants
const DOC_SUBDIR = 'docs';
const INDEX_FILENAME = '.index.json';

/**
 * Ensure boundary directories exist, creating them if necessary
 *
 * @param projectDocBoundary - Project docs directory path
 * @param sharedDocBoundary - Shared docs directory path
 * @throws {Error} If directories cannot be created due to permissions
 */
const ensureBoundariesSync = (projectDocBoundary: string, sharedDocBoundary: string): void => {
    try {
        mkdirSync(projectDocBoundary, { recursive: true });
        mkdirSync(sharedDocBoundary, { recursive: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
            `Failed to create swic directories. Please check permissions.\n` +
            `Project: ${projectDocBoundary}\n` +
            `Shared: ${sharedDocBoundary}\n` +
            `Error: ${message}`
        );
    }
};

/**
 * Lazily get data directories, creating them if they don't exist
 *
 * This function attempts to find an existing .swic directory by walking up
 * from the current directory. If not found, it uses the current directory.
 * It then ensures both project and shared directories exist, creating them
 * if necessary.
 *
 * @returns Object with projectDataDir and sharedDataDir paths
 * @throws {Error} If directories cannot be created due to permissions
 */
const lazilyGetDataDirs = (): DataDirs => {
    let projectBoundaryDir: string;

    try {
        // Try to find existing .swic directory walking up
        projectBoundaryDir = FindProjectRoot.findProjectRoot();
    }
    catch {
        // Not found - use current directory (will be created)
        projectBoundaryDir = resolve(process.cwd(), '.swic');
    }

    const sharedBoundaryDir = resolve(homedir(), '.swic');

    // Ensure both directories exist (creates if needed)
    const projectDocBoundary = `${projectBoundaryDir}/${DOC_SUBDIR}`;
    const sharedDocBoundary = `${sharedBoundaryDir}/${DOC_SUBDIR}`;
    ensureBoundariesSync(projectDocBoundary, sharedDocBoundary);

    return {
        projectDataDir: projectBoundaryDir,
        sharedDataDir: sharedBoundaryDir
    };
};

/**
 * Create all core services with dependency injection
 *
 * @param options - Configuration with project and shared boundary directories
 * @returns Frozen object containing all initialized services
 * @throws {Error} If boundary directories are invalid or inaccessible
 */
const createServices = (options: CoreOptions): Readonly<CoreServices> => {
    const { projectBoundaryDir, sharedBoundaryDir } = options;

    const projectDocBoundary = `${projectBoundaryDir}/${DOC_SUBDIR}`;
    const sharedDocBoundary = `${sharedBoundaryDir}/${DOC_SUBDIR}`;

    const projectFileService = FileService.create({boundaryDir: projectDocBoundary});
    const sharedFileService = FileService.create({boundaryDir: sharedDocBoundary});
    const projectFolderService = FolderService.create({boundaryDir: projectDocBoundary});
    const sharedFolderService = FolderService.create({boundaryDir: sharedDocBoundary});

    const docService = DocService.create({
        fileServiceByScope: {
            project: projectFileService,
            shared: sharedFileService
        },
        folderServiceByScope: {
            project: projectFolderService,
            shared: sharedFolderService
        },
        indexFilename: INDEX_FILENAME
    });

    return Object.freeze({
        DocService: docService
    });
};

const Core = Object.freeze({
    createServices,
    lazilyGetDataDirs
});

export default Core;
export type { CoreOptions, CoreServices, DataDirs };
