import { resolve } from 'path';
import { homedir } from 'os';
import FileService from './services/FileService.js';
import FolderService from './services/FolderService.js';
import CartridgeService from './services/CartridgeService.js';

import type { CartridgeServiceApi } from './services/CartridgeService.js';

/**
 * Core module configuration options
 */
interface CoreOptions {
    /** Absolute path to project boundary directory */
    projectBoundaryDir: string;
    /** Absolute path to shared boundary directory */
    sharedBoundaryDir: string;
}

/**
 * Core services exposed to server and CLI layers
 */
interface CoreServices {
    cartridgeService: CartridgeServiceApi;
    // Future: storyService, subtaskService, pipelineService, templateService, etc.
}

// Constants
const CARTRIDGE_SUBDIR = 'cartridges';
const INDEX_FILENAME = '.index.json';

/**
 * Create all core services with dependency injection
 *
 * Initializes file and folder services for each scope (project/shared),
 * then creates high-level services that use them.
 *
 * @param options - Configuration with project and shared boundary directories
 * @returns Frozen object containing all initialized services
 * @throws {Error} If boundary directories are invalid or inaccessible
 *
 * @example
 * ```typescript
 * const services = Core.createServices({
 *     projectBoundaryDir: '/path/to/project/.swic/project',
 *     sharedBoundaryDir: '/Users/paul/.swic/shared'
 * });
 *
 * await services.cartridgeService.create({
 *     address: { kind: 'path', scope: 'project', path: 'auth/jwt' },
 *     content: '...'
 * });
 * ```
 */
const createServices = (options: CoreOptions): Readonly<CoreServices> => {
    const { projectBoundaryDir, sharedBoundaryDir } = options;

    // Construct cartridge-specific boundaries
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

/**
 * Get default boundary directories based on conventions
 *
 * Defaults:
 * - projectBoundaryDir: `<cwd>/.swic/project`
 * - sharedBoundaryDir: `~/.swic/shared`
 *
 * Can be overridden via environment variables:
 * - SWIC_PROJECT_BOUNDARY
 * - SWIC_SHARED_BOUNDARY
 *
 * @returns Object with projectBoundaryDir and sharedBoundaryDir
 */
const getDefaultBoundaries = (): CoreOptions => {
    const projectBoundary = process.env.SWIC_PROJECT_BOUNDARY
        || resolve(process.cwd(), '.swic/project');
    const sharedBoundary = process.env.SWIC_SHARED_BOUNDARY
        || resolve(homedir(), '.swic/shared');

    return {
        projectBoundaryDir: projectBoundary,
        sharedBoundaryDir: sharedBoundary
    };
};

/**
 * Core module
 *
 * Central service factory for SWIC. Manages dependency injection and
 * service lifecycle for all high-level domain services.
 *
 * ## Service Architecture
 *
 * Core creates and wires together:
 * - Low-level services (FileService, FolderService) - scoped by project/shared
 * - High-level services (CartridgeService, etc.) - use low-level services
 *
 * High-level services are exposed to server/CLI layers, while low-level
 * services remain internal implementation details.
 *
 * ## Directory Structure
 *
 * ```
 * ~/.swic/
 *   shared/
 *     cartridges/
 *     # Future: templates/, pipelines/, etc.
 *
 * /path/to/project/.swic/
 *   project/
 *     cartridges/
 *     stories/
 *     subtasks/
 *     # Future: runs/, etc.
 * ```
 *
 * ## Configuration
 *
 * By convention, boundaries default to:
 * - Project: `<cwd>/.swic/project`
 * - Shared: `~/.swic/shared`
 *
 * Override via environment variables or explicit options:
 * ```bash
 * SWIC_PROJECT_BOUNDARY=/custom/path/.swic/project
 * SWIC_SHARED_BOUNDARY=/custom/path/.swic/shared
 * ```
 *
 * @module Core
 */
const Core = Object.freeze({
    createServices,
    getDefaultBoundaries
});

export default Core;
export type { CoreOptions, CoreServices };
