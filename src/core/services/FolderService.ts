import { mkdir, rm, rmdir, stat as fsStat, readdir } from 'fs/promises';
import { resolve, dirname, isAbsolute } from 'path';
import pathSecurity from '../utils/pathSecurity.js';

import type { Stats } from 'fs';
import type { FsError, ResolveOptions } from '../utils/pathSecurity.js';

/**
 * Options for creating a FolderService instance
 */
interface FolderServiceOptions {
    /** Absolute path to boundary directory (e.g., /path/to/project/.data) */
    boundaryDir: string;
}

/**
 * Service API for folder/directory operations within a boundary
 */
interface FolderServiceApi {
    /**
     * Normalize a folder name to be filesystem-friendly
     *
     * Advisory slugification - not a security validation.
     * Converts to lowercase, replaces special chars with hyphens.
     * Character set: ASCII lowercase alphanumeric plus `-` and `_`
     *
     * @param name - The name to normalize
     * @returns Normalized name (lowercase, special chars replaced with hyphens)
     * @throws {FsError} VALIDATION_ERROR if normalized result is empty (e.g., input "___")
     */
    normalizeName(name: string): string;

    /**
     * Resolve a relative path within the boundary
     *
     * Guarantees:
     * - Input validation: rejects absolute paths, empty paths, and ".." segments
     * - Boundary enforcement: ensures resolved path stays within boundary
     * - Symlink handling: detects symlinks and validates targets remain within boundary
     * - Normalized output: `rel` uses POSIX "/" separators with no "." or ".." segments
     * - Absolute path: `abs` uses native OS format
     *
     * @param relativePath - Path relative to the boundary directory
     * @param options - Resolution options
     * @param options.followSymlinks - If true, resolve symlinks to final target (default: false)
     * @returns Object with `abs` (native absolute path) and `rel` (normalized POSIX-style relative path)
     * @throws {FsError} VALIDATION_ERROR if path is absolute, empty, or contains ".."
     * @throws {FsError} BOUNDARY_VIOLATION if resolved path escapes boundary or symlink points outside
     */
    resolve(relativePath: string, options?: ResolveOptions): Promise<{ abs: string; rel: string }>;

    /**
     * Check if an absolute path is inside the boundary
     * @param targetAbs - Absolute path to check
     * @returns True if the path is within the boundary
     * @throws {FsError} VALIDATION_ERROR if targetAbs is not an absolute path
     */
    isInsideBoundary(targetAbs: string): boolean;

    /**
     * Ensure a directory exists, creating it if necessary
     * @param relativePath - Path relative to the boundary directory
     * @throws {FsError} If the path escapes the boundary or validation fails
     */
    ensureDir(relativePath: string): Promise<void>;

    /**
     * Get the parent directory of a relative path
     *
     * Validates the input path for security and normalizes the output.
     *
     * Examples:
     * - `'a/b'` → `'a'`
     * - `'a'` → `'.'`
     *
     * @param relativePath - Path relative to the boundary directory
     * @returns Parent directory path (POSIX-style, validated and normalized)
     * @throws {FsError} If path validation fails
     */
    parentDir(relativePath: string): string;

    /**
     * Get filesystem stats for a path
     *
     * Works on any filesystem path within the boundary (files, directories, symlinks, etc.).
     * Follows symlinks - if you need to detect symlinks specifically, use lstat (not yet implemented).
     *
     * Note: The method name is historical - it works on all entities, not just directories.
     *
     * @param relativePath - Path relative to the boundary directory
     * @returns Stats object from fs module (use .isFile(), .isDirectory(), .size, .mtime, etc.)
     * @throws {FsError} NOT_FOUND if path doesn't exist
     * @throws {FsError} VALIDATION_ERROR if path is invalid
     * @throws {FsError} BOUNDARY_VIOLATION if path escapes boundary
     * @throws {FsError} FS_ERROR for permission or other filesystem errors
     */
    stat(relativePath: string): Promise<Stats>;

    /**
     * Delete a directory
     *
     * Options (defaults: recursive=false, requireEmpty=false):
     * - Use `recursive: true` to delete non-empty directories
     * - Use `requireEmpty: true` to validate directory is empty (best-effort check by OS)
     * - Options are mutually exclusive
     *
     * Protection: Cannot delete the boundary root directory (throws VALIDATION_ERROR).
     *
     * Idempotent: Returns `{deleted: false, reason: 'NOT_FOUND'}` if directory doesn't exist.
     *
     * TOCTOU note: `requireEmpty` check has a race window. The OS validates emptiness
     * during the delete operation itself.
     *
     * @param relativePath - Path relative to the boundary directory
     * @param opts - Options for deletion
     * @param opts.recursive - If true, delete non-empty directories (default: false)
     * @param opts.requireEmpty - If true, only delete if directory is empty (default: false)
     * @returns Object indicating success with optional reason for failure
     * @throws {FsError} VALIDATION_ERROR if attempting to delete boundary root or options conflict
     * @throws {FsError} DIRECTORY_NOT_EMPTY if requireEmpty is true and directory is not empty
     * @throws {FsError} BOUNDARY_VIOLATION if path escapes boundary
     */
    deleteDir(
        relativePath: string,
        opts?: { recursive?: boolean; requireEmpty?: boolean }
    ): Promise<{ deleted: boolean; reason?: 'NOT_FOUND' | 'NOT_DIR' }>;
}


/**
 * Create a FolderService instance with a boundary directory
 * @param options - Configuration options
 * @param options.boundaryDir - Absolute path to the boundary directory
 * @returns FolderService API instance
 * @example
 * ```typescript
 * const folderService = FolderService.create({
 *   boundaryDir: resolve(process.cwd(), '.data')
 * });
 * await folderService.ensureDir('project/stories');
 * ```
 */
const create = (options: FolderServiceOptions): FolderServiceApi => {
    const { boundaryDir } = options;

    // Validate boundary directory (TypeScript already enforces string type)
    if (!boundaryDir) {
        throw pathSecurity.fsError(
            'VALIDATION_ERROR',
            'boundaryDir is required (empty string)',
            { boundaryDir }
        );
    }

    if (!isAbsolute(boundaryDir)) {
        throw pathSecurity.fsError(
            'VALIDATION_ERROR',
            `boundaryDir must be an absolute path: '${boundaryDir}'`,
            { boundaryDir }
        );
    }

    // Normalize the boundary directory path
    const normalizedBoundary = resolve(boundaryDir);

    /**
     * Normalize folder names (remove special chars, spaces to hyphens, lowercase)
     *
     * This is a domain-specific slugification function. It is NOT a security
     * validation - use for advisory naming conventions only.
     *
     * Character set: ASCII lowercase alphanumeric plus `-` and `_`
     * Non-ASCII characters are replaced with hyphens.
     *
     * @throws {FsError} VALIDATION_ERROR if the normalized result is empty
     * @internal
     */
    const normalizeName = (name: string): string => {
        const normalized = name
            .toLowerCase()
            .replace(/[^a-z0-9-_]/g, '-')  // Replace special chars with hyphens
            .replace(/-+/g, '-')            // Replace multiple hyphens with single
            .replace(/^-|-$/g, '');         // Remove leading/trailing hyphens

        if (!normalized) {
            throw pathSecurity.fsError(
                'VALIDATION_ERROR',
                `normalizeName produced empty result from input: '${name}'`,
                { name, normalized }
            );
        }

        return normalized;
    };

    /**
     * Resolve a relative path within boundary using secure path utilities
     * This is the single gateway for all boundary-checked operations
     * @internal
     */
    const resolveInternal = async (
        relativePath: string,
        options?: ResolveOptions
    ): Promise<{ abs: string; rel: string }> => {
        return await pathSecurity.resolveWithinBoundary(
            normalizedBoundary,
            relativePath,
            options
        );
    };

    /**
     * Check if an absolute path is inside the boundary
     * @internal
     */
    const isInsideBoundary = (targetAbs: string): boolean => {
        // Validate input is absolute
        if (!isAbsolute(targetAbs)) {
            throw pathSecurity.fsError(
                'VALIDATION_ERROR',
                `targetAbs must be an absolute path: '${targetAbs}'`,
                { targetAbs }
            );
        }

        const normalized = resolve(targetAbs);
        return pathSecurity.insideBoundary(normalizedBoundary, normalized);
    };

    /**
     * Ensure a directory exists (create if needed)
     * @internal
     */
    const ensureDir = async (relativePath: string): Promise<void> => {
        const { abs } = await resolveInternal(relativePath);
        try {
            await mkdir(abs, { recursive: true });
        }
        catch (error: any) {
            throw pathSecurity.mapOsError(error, {
                path: relativePath,
                resolved: abs,
                operation: 'ensureDir'
            });
        }
    };

    /**
     * Get parent directory of a relative path
     * Validates input and normalizes output
     * @internal
     */
    const parentDir = (relativePath: string): string => {
        // Validate the input path first
        const validated = pathSecurity.validateRelative(relativePath);
        // Get parent and re-normalize
        const parent = dirname(validated);
        // Return '.' if at root, otherwise return normalized parent
        return parent === '.' ? parent : parent.replaceAll('\\', '/');
    };

    /**
     * Get stats for a path
     * @internal
     */
    const stat = async (relativePath: string): Promise<Stats> => {
        const { abs } = await resolveInternal(relativePath);
        try {
            const stats = await fsStat(abs);
            // Note: This stats any path type, not just directories
            // This is intentional for flexibility
            return stats;
        }
        catch (error: any) {
            throw pathSecurity.mapOsError(error, {
                path: relativePath,
                resolved: abs,
                operation: 'stat'
            });
        }
    };

    /**
     * Delete a directory
     * @internal
     */
    const deleteDir = async (
        relativePath: string,
        opts?: { recursive?: boolean; requireEmpty?: boolean }
    ): Promise<{ deleted: boolean; reason?: 'NOT_FOUND' | 'NOT_DIR' }> => {
        // Validate conflicting options
        if (opts?.requireEmpty && opts?.recursive) {
            throw pathSecurity.fsError(
                'VALIDATION_ERROR',
                'requireEmpty and recursive are mutually exclusive',
                { path: relativePath }
            );
        }

        const { abs } = await resolveInternal(relativePath);

        // Protect boundary root from deletion
        if (abs === normalizedBoundary) {
            throw pathSecurity.fsError(
                'VALIDATION_ERROR',
                `Cannot delete boundary root: '${relativePath}' → '${abs}'`,
                { path: relativePath, resolved: abs, boundary: normalizedBoundary }
            );
        }

        // Check if directory exists and is a directory
        let stats: Stats;
        try {
            stats = await fsStat(abs);
        }
        catch (error: any) {
            if (error.code === 'ENOENT') {
                return { deleted: false, reason: 'NOT_FOUND' };
            }
            throw pathSecurity.mapOsError(error, {
                path: relativePath,
                resolved: abs,
                operation: 'stat'
            });
        }

        if (!stats.isDirectory()) {
            return { deleted: false, reason: 'NOT_DIR' };
        }

        // If requireEmpty is true, check if directory is empty
        // This check is outside try-catch so the throw propagates directly
        if (opts?.requireEmpty) {
            let entries: string[];
            try {
                entries = await readdir(abs);
            }
            catch (error: any) {
                throw pathSecurity.mapOsError(error, {
                    path: relativePath,
                    resolved: abs,
                    operation: 'readdir'
                });
            }

            if (entries.length > 0) {
                throw pathSecurity.fsError(
                    'DIRECTORY_NOT_EMPTY',
                    `Directory not empty: '${relativePath}' → '${abs}'`,
                    { path: relativePath, resolved: abs }
                );
            }

            // Directory is verified empty - use rmdir() for compatibility
            try {
                await rmdir(abs);
                return { deleted: true };
            }
            catch (error: any) {
                if (error.code === 'ENOENT') {
                    return { deleted: false, reason: 'NOT_FOUND' };
                }
                // ENOTEMPTY shouldn't happen since we just checked, but handle race
                if (error.code === 'ENOTEMPTY') {
                    throw pathSecurity.fsError(
                        'DIRECTORY_NOT_EMPTY',
                        `Directory not empty (race condition): '${relativePath}' → '${abs}'`,
                        { path: relativePath, resolved: abs }
                    );
                }
                throw pathSecurity.mapOsError(error, {
                    path: relativePath,
                    resolved: abs,
                    operation: 'rmdir'
                });
            }
        }

        // Delete the directory (possibly with contents if recursive=true)
        // Note: recursive defaults to false. If directory is non-empty and recursive=false,
        // rm() will throw ENOTEMPTY (Linux) or EACCES (macOS) which we map to DIRECTORY_NOT_EMPTY
        try {
            await rm(abs, { recursive: opts?.recursive ?? false });
            return { deleted: true };
        }
        catch (error: any) {
            // Handle race condition - directory disappeared or became non-empty
            if (error.code === 'ENOENT') {
                return { deleted: false, reason: 'NOT_FOUND' };
            }

            // Map directory-not-empty errors (OS-specific error codes)
            if (error.code === 'ENOTEMPTY' || error.code === 'EISDIR' || error.code === 'EACCES') {
                throw pathSecurity.fsError(
                    'DIRECTORY_NOT_EMPTY',
                    `Directory not empty: '${relativePath}' → '${abs}'`,
                    { path: relativePath, resolved: abs, originalCode: error.code }
                );
            }

            // Map other OS errors
            throw pathSecurity.mapOsError(error, {
                path: relativePath,
                resolved: abs,
                operation: 'deleteDir'
            });
        }
    };

    return Object.freeze({
        normalizeName,
        resolve: resolveInternal,
        isInsideBoundary,
        ensureDir,
        parentDir,
        stat,
        deleteDir
    });
};

/**
 * FolderService module for managing directories within a boundary
 *
 * Provides safe directory operations that are confined to a specified
 * boundary directory, preventing path traversal attacks and ensuring
 * all operations stay within the intended directory tree.
 *
 * ## Security Features
 *
 * - **Robust boundary checking** using relative path analysis (not string prefix matching)
 * - **Input validation** for all relative paths (rejects absolute, empty, `..` segments)
 * - **Symlink handling** with boundary enforcement (validates targets stay within boundary)
 * - **Structured error handling** with typed codes and contextual information
 * - **TOCTOU mitigations** (final consistency guaranteed by OS)
 *
 * ## Idempotency Guarantees
 *
 * - `ensureDir()`: Idempotent - safe to call multiple times
 * - `deleteDir()`: Idempotent when directory doesn't exist - returns `{deleted: false, reason: 'NOT_FOUND'}`
 * - `resolve()`: Not idempotent (reads filesystem state)
 * - `stat()`: Not idempotent (reads filesystem state)
 *
 * ## Path Normalization
 *
 * All relative paths returned are normalized to POSIX-style (`/` separators, no `.` or `..`).
 * Absolute paths use native OS format (backslashes on Windows).
 *
 * ## Boundary Requirements
 *
 * - The `boundaryDir` must be an absolute path
 * - The resolved path is treated as canonical for the service lifetime
 * - All operations enforce that paths remain within this boundary
 *
 * ## Error Codes
 *
 * See pathSecurity module documentation for complete error taxonomy.
 * Common codes: `VALIDATION_ERROR`, `BOUNDARY_VIOLATION`, `NOT_FOUND`, `DIRECTORY_NOT_EMPTY`, `FS_ERROR`
 *
 * @module FolderService
 */
const FolderService = Object.freeze({
    create
});

export default FolderService;
export type { FolderServiceApi, FolderServiceOptions };
export type { FsError, ResolveOptions } from '../utils/pathSecurity.js';