import { resolve } from 'path';
import { homedir } from 'os';
import FileService from './services/FileService.js';
import FolderService from './services/FolderService.js';
import CartridgeService from './services/CartridgeService.js';

import type { CartridgeServiceApi } from './services/CartridgeService.js';

interface CoreOptions {
    projectBoundaryDir: string;
    sharedBoundaryDir: string;
}

interface CoreServices {
    cartridgeService: CartridgeServiceApi;
}

// Constants
const CARTRIDGE_SUBDIR = 'cartridges';
const INDEX_FILENAME = '.index.json';

/**
 * Create all core services with dependency injection
 *
 * @param options - Configuration with project and shared boundary directories
 * @returns Frozen object containing all initialized services
 * @throws {Error} If boundary directories are invalid or inaccessible
 */
const createServices = (options: CoreOptions): Readonly<CoreServices> => {
    const { projectBoundaryDir, sharedBoundaryDir } = options;

    // Construct cartridge-specific boundaries within each root
    const projectCartridgeBoundary = `${projectBoundaryDir}/${CARTRIDGE_SUBDIR}`;
    const sharedCartridgeBoundary = `${sharedBoundaryDir}/${CARTRIDGE_SUBDIR}`;

    // Create file services for each scope
    const projectFileService = FileService.create({
        boundaryDir: projectCartridgeBoundary
    });
    const sharedFileService = FileService.create({
        boundaryDir: sharedCartridgeBoundary
    });

    // Create folder services for each scope
    const projectFolderService = FolderService.create({
        boundaryDir: projectCartridgeBoundary
    });
    const sharedFolderService = FolderService.create({
        boundaryDir: sharedCartridgeBoundary
    });

    // Create high-level services
    const cartridgeService = CartridgeService.create({
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
        cartridgeService
    });
};

const Core = Object.freeze({
    createServices
});

export default Core;
export type { CoreOptions, CoreServices };
