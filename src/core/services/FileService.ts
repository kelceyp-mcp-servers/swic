import { readFile, writeFile, unlink, stat as fsStat, rename, access, mkdir } from 'fs/promises';
import { constants } from 'fs';
import { resolve, dirname, isAbsolute } from 'path';
import pathSecurity from '../utils/pathSecurity.js';

import type { Stats } from 'fs';
import type { FsError as _FsError } from '../utils/pathSecurity.js';

/**
 * Options for creating a FileService instance
 */
interface FileServiceOptions {
    /** Absolute path to boundary directory (e.g., /path/to/project/.data) */
    boundaryDir: string;
}

/**
 * Service API for file operations within a boundary
 */
interface FileServiceApi {
    /**
     * Check if a path exists (file, directory, or other)
     *
     * This is an advisory check only, subject to TOCTOU (time-of-check-time-of-use) races.
     * Do not use this as a precondition gate for mutations. Instead, perform the operation
     * directly and handle NOT_FOUND errors.
     *
     * Note: Returns true for any path type (file, directory, symlink, etc.), not just regular files.
     *
     * @param relativePath - Path relative to the boundary directory
     * @returns True if the path exists at the time of check (non-authoritative)
     */
    exists(relativePath: string): Promise<boolean>;

    /**
     * Get filesystem stats for a file or directory
     *
     * Works on any filesystem path within the boundary (files or directories).
     * Follows symlinks (use lstat if you need to detect symlinks specifically).
     *
     * @param relativePath - Path relative to the boundary directory
     * @returns Stats object from fs module (use .isFile(), .isDirectory(), .size, etc.)
     * @throws {FsError} NOT_FOUND if path doesn't exist
     * @throws {FsError} VALIDATION_ERROR if path is invalid
     * @throws {FsError} BOUNDARY_VIOLATION if path escapes boundary
     * @throws {FsError} FS_ERROR for permission or other filesystem errors
     */
    stat(relativePath: string): Promise<Stats>;

    /**
     * Read a text file
     *
     * Reads file content as UTF-8 encoded text. Do not use this method for binary files.
     *
     * @param relativePath - Path relative to the boundary directory
     * @returns File content as UTF-8 string
     * @throws {FsError} NOT_FOUND if file doesn't exist
     * @throws {FsError} VALIDATION_ERROR if path is invalid
     * @throws {FsError} BOUNDARY_VIOLATION if path escapes boundary
     * @throws {FsError} FS_ERROR for permission or other filesystem errors
     */
    readText(relativePath: string): Promise<string>;

    /**
     * Safely resolve a relative path within the boundary
     *
     * Guarantees:
     * - Input validation: rejects absolute paths and ".." segments
     * - Boundary enforcement: ensures resolved path stays within boundary
     * - Symlink handling: detects symlinks and validates targets remain within boundary
     * - Normalized output: rel uses POSIX "/" separators with no "." or ".." segments
     *
     * @param relativePath - Path relative to the boundary directory
     * @returns Object with abs (absolute path) and rel (normalized relative path with POSIX separators)
     * @throws {FsError} VALIDATION_ERROR if path is absolute or contains ".."
     * @throws {FsError} BOUNDARY_VIOLATION if resolved path escapes boundary or symlink points outside
     */
    resolveSafe(relativePath: string): Promise<{ abs: string; rel: string }>;

    /**
     * Write text to a file atomically
     * Uses last-write-wins semantics - always overwrites existing content
     * @param relativePath - Path relative to the boundary directory
     * @param newContent - New content to write
     * @throws {FsError} If the path escapes the boundary or validation fails
     */
    writeText(
        relativePath: string,
        newContent: string
    ): Promise<void>;

    /**
     * Delete a file
     *
     * Uses last-write-wins semantics - always deletes if file exists.
     * This operation is idempotent: if the file doesn't exist, returns { deleted: false }
     * without throwing an error. Callers should treat this as success (desired end state achieved).
     *
     * @example
     * // First call: file exists
     * await service.delete('file.txt');  // { deleted: true }
     * // Second call: file already gone
     * await service.delete('file.txt');  // { deleted: false } - success!
     *
     * @param relativePath - Path relative to the boundary directory
     * @returns Object with deleted boolean (true if deleted, false if already missing)
     * @throws {FsError} BOUNDARY_VIOLATION if path escapes boundary
     * @throws {FsError} FS_ERROR for permission or other filesystem errors
     */
    delete(
        relativePath: string
    ): Promise<{ deleted: boolean }>;

    /**
     * Preview text replacements without modifying the file
     *
     * Applies replacements sequentially to in-memory content (not the file).
     * Each replacement uses string-based matching (not regex) and replaces only
     * the first occurrence of oldText. Each subsequent replacement operates on
     * the result of the previous replacement.
     *
     * Note: If oldText === newText, the replacement is counted as "applied" even
     * though the content doesn't change.
     *
     * @param content - Content to preview replacements on
     * @param replacements - Array of replacements to apply (order matters)
     * @param options - Preview options
     * @param options.requireAll - If true, throws error if applied !== replacements.length
     * @returns Preview result with new content and count of replacements
     * @throws {FsError} VALIDATION_ERROR if any oldText is empty string
     * @throws {FsError} VALIDATION_ERROR if requireAll is true and not all replacements were applied
     */
    previewReplaceFirst(
        content: string,
        replacements: Array<{ oldText: string; newText: string }>,
        options?: { requireAll?: boolean }
    ): { wouldContent: string; applied: number };

    /**
     * Apply text replacements atomically
     *
     * Uses last-write-wins semantics - always applies replacements to current content.
     * Delegates to previewReplaceFirst() for validation and replacement logic.
     *
     * If applied === 0 (no replacements matched), no write occurs.
     *
     * @param relativePath - Path relative to the boundary directory
     * @param replacements - Array of replacements to apply (order matters, see previewReplaceFirst)
     * @param options - Replacement options
     * @param options.requireAll - If true, throws error if not all replacements were applied
     * @returns Result with count of replacements applied
     * @throws {FsError} VALIDATION_ERROR if oldText is empty
     * @throws {FsError} VALIDATION_ERROR if requireAll is true and not all replacements were applied
     * @throws {FsError} BOUNDARY_VIOLATION if path escapes boundary
     * @throws {FsError} FS_ERROR for permission or other filesystem errors
     */
    applyReplaceFirst(
        relativePath: string,
        replacements: Array<{ oldText: string; newText: string }>,
        options?: { requireAll?: boolean }
    ): Promise<{ applied: number }>;
}


/**
 * Create a FileService instance with a boundary directory
 * @param options - Configuration options
 * @param options.boundaryDir - Absolute path to the boundary directory
 * @returns FileService API instance
 * @example
 * ```typescript
 * const fileService = FileService.create({
 *   boundaryDir: resolve(process.cwd(), '.data')
 * });
 * const content = await fileService.readText('project/docs/example.md');
 * ```
 */
const create = (options: FileServiceOptions): FileServiceApi => {
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
     * Helper to resolve paths within boundary using secure utilities
     * This is the single gateway for all boundary-checked operations
     * @internal
     */
    const resolvePath = async (relativePath: string): Promise<string> => {
        const { abs } = await pathSecurity.resolveWithinBoundary(
            normalizedBoundary,
            relativePath
        );
        return abs;
    };


    /**
     * Check if file exists
     * @internal
     */
    const exists = async (relativePath: string): Promise<boolean> => {
        const absPath = await resolvePath(relativePath);
        try {
            await access(absPath, constants.F_OK);
            return true;
        }
        catch {
            return false;
        }
    };

    /**
     * Get file stats
     * @internal
     */
    const stat = async (relativePath: string): Promise<Stats> => {
        const absPath = await resolvePath(relativePath);
        try {
            return await fsStat(absPath);
        }
        catch (error: any) {
            throw pathSecurity.mapOsError(error, {
                path: relativePath,
                resolved: absPath,
                operation: 'stat'
            });
        }
    };

    /**
     * Read text file
     * @internal
     */
    const readText = async (relativePath: string): Promise<string> => {
        const absPath = await resolvePath(relativePath);

        // Validate it's a file first (separate from I/O error handling)
        let stats;
        try {
            stats = await fsStat(absPath);
        }
        catch (error: any) {
            throw pathSecurity.mapOsError(error, {
                path: relativePath,
                resolved: absPath,
                operation: 'stat'
            });
        }

        // Validation check - not caught by error handler
        if (!stats.isFile()) {
            throw pathSecurity.fsError(
                'VALIDATION_ERROR',
                'Target is not a regular file',
                { path: relativePath, resolved: absPath }
            );
        }

        // Read the file
        try {
            const content = await readFile(absPath, 'utf-8');
            return content;
        }
        catch (error: any) {
            throw pathSecurity.mapOsError(error, {
                path: relativePath,
                resolved: absPath,
                operation: 'readFile'
            });
        }
    };

    /**
     * Write text atomically
     * @internal
     */
    const writeText = async (
        relativePath: string,
        newContent: string
    ): Promise<void> => {
        const absPath = await resolvePath(relativePath);

        // Guard against writing to existing directory paths
        let targetStat;
        try {
            targetStat = await fsStat(absPath);
        }
        catch (statError: any) {
            // ENOENT is expected for new files - file truly doesn't exist
            if (statError.code === 'ENOENT') {
                // Expected case: path doesn't exist, continue to create
                targetStat = null;
            }
            else {
                // Unexpected error (permissions, etc.)
                throw pathSecurity.mapOsError(statError, {
                    path: relativePath,
                    resolved: absPath,
                    operation: 'stat'
                });
            }
        }

        // Validation check - separate from I/O error handling
        if (targetStat && !targetStat.isFile()) {
            throw pathSecurity.fsError(
                'VALIDATION_ERROR',
                'Target path exists and is not a regular file',
                { path: relativePath, resolved: absPath }
            );
        }

        // Ensure parent directory exists
        try {
            await mkdir(dirname(absPath), { recursive: true });
        }
        catch (mkdirError: any) {
            throw pathSecurity.mapOsError(mkdirError, {
                path: dirname(relativePath),
                resolved: dirname(absPath),
                operation: 'mkdir'
            });
        }

        // Write to temp file then rename atomically
        // Use process.pid and random suffix to avoid collisions
        // Temp file created with restrictive 0o600 perms; rename() preserves these
        // permissions on the final file (standard POSIX behavior)
        const tempPath = `${absPath}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
        try {
            await writeFile(tempPath, newContent, { encoding: 'utf-8', mode: 0o600 });
            await rename(tempPath, absPath);
        }
        catch (error: any) {
            // Clean up temp file if rename failed
            try {
                await unlink(tempPath);
            }
            catch {
                // Ignore cleanup errors
            }
            throw pathSecurity.mapOsError(error, {
                path: relativePath,
                resolved: absPath,
                operation: 'writeText'
            });
        }
    };

    /**
     * Delete file
     * @internal
     */
    const deleteFile = async (
        relativePath: string
    ): Promise<{ deleted: boolean }> => {
        const absPath = await resolvePath(relativePath);

        // Delete the file
        try {
            await unlink(absPath);
            return { deleted: true };
        }
        catch (error: any) {
            // File doesn't exist - idempotent success
            if (error.code === 'ENOENT') {
                return { deleted: false };
            }
            throw pathSecurity.mapOsError(error, {
                path: relativePath,
                resolved: absPath,
                operation: 'delete'
            });
        }
    };

    /**
     * Preview text replacements without applying
     * @internal
     */
    const previewReplaceFirst = (
        content: string,
        replacements: Array<{ oldText: string; newText: string }>,
        options?: { requireAll?: boolean }
    ): { wouldContent: string; applied: number } => {
        // Validate replacement inputs (TypeScript already enforces string types)
        for (let i = 0; i < replacements.length; i++) {
            const { oldText } = replacements[i];

            // Empty string validation
            if (oldText.length === 0) {
                throw pathSecurity.fsError(
                    'VALIDATION_ERROR',
                    `Empty oldText in replacement at index ${i} would cause infinite loop`,
                    { index: i }
                );
            }
        }

        let wouldContent = content;
        let applied = 0;

        // Apply replacements sequentially
        for (const { oldText, newText } of replacements) {
            if (wouldContent.includes(oldText)) {
                wouldContent = wouldContent.replace(oldText, newText);
                applied++;
            }
        }

        // If requireAll is true, ensure all replacements were applied
        if (options?.requireAll && applied !== replacements.length) {
            throw pathSecurity.fsError(
                'VALIDATION_ERROR',
                `Only ${applied} of ${replacements.length} replacements were applied (requireAll=true)`,
                { applied, total: replacements.length }
            );
        }

        return {
            wouldContent,
            applied
        };
    };

    /**
     * Apply text replacements atomically
     * @internal
     */
    const applyReplaceFirst = async (
        relativePath: string,
        replacements: Array<{ oldText: string; newText: string }>,
        options?: { requireAll?: boolean }
    ): Promise<{ applied: number }> => {
        // Read current content
        const content = await readText(relativePath);

        // Preview the changes (validates and applies requireAll logic)
        const { wouldContent, applied } = previewReplaceFirst(content, replacements, options);

        // If no changes, don't write
        if (applied === 0) {
            return { applied: 0 };
        }

        // Write the modified content atomically
        await writeText(relativePath, wouldContent);

        return { applied };
    };

    /**
     * Expose safe path resolution for other services
     * @internal
     */
    const resolveSafe = async (relativePath: string): Promise<{ abs: string; rel: string }> => {
        return pathSecurity.resolveWithinBoundary(normalizedBoundary, relativePath);
    };

    return Object.freeze({
        exists,
        stat,
        readText,
        resolveSafe,
        writeText,
        delete: deleteFile,
        previewReplaceFirst,
        applyReplaceFirst
    });
};

/**
 * FileService module for managing files within a boundary
 *
 * Provides safe file operations with last-write-wins semantics
 * and atomic writes. All operations are confined to a specified boundary
 * directory, preventing path traversal attacks.
 *
 * ## Security Features
 *
 * - Robust boundary checking using relative path analysis and realpath resolution
 * - Input validation rejecting absolute paths and ".." traversal attempts
 * - Symlink handling: detects symlinks and verifies targets remain within boundary
 * - Structured error handling with contextual information (FsError type)
 * - Atomic write operations with collision-resistant temp file naming
 *
 * ## Replacement Semantics
 *
 * Text replacements via previewReplaceFirst and applyReplaceFirst:
 * - Applied sequentially to in-memory content (not the file)
 * - Each replacement affects subsequent replacements
 * - Only first occurrence of oldText is replaced per replacement entry
 * - Empty oldText is rejected (would cause infinite loop)
 * - Use requireAll: true to ensure all replacements match
 *
 * ## File Operations Scope
 *
 * The stat() operation works on any filesystem path within the boundary
 * (files or directories). It follows symlinks. Use lstat if you need to
 * detect symlinks specifically.
 *
 * ## Idempotent Delete
 *
 * delete() returns {deleted: false} when the file doesn't exist.
 * This is intentional - the desired end state (file not existing) is achieved.
 * Callers should treat this as success, not an error condition.
 *
 * ## Atomic Write Details
 *
 * Atomic writes use:
 * - Temp file pattern: {path}.{pid}.{random}.tmp
 * - Write to temp, then rename (atomic on POSIX)
 * - Cleanup on failure (best effort)
 * - Directory creation with recursive: true
 *
 * Edge case: If rename succeeds but a subsequent error occurs, the file
 * is in the new state. This is by design for atomicity.
 *
 * @module FileService
 */
const FileService = Object.freeze({
    create
});

export default FileService;
export type { FileServiceApi, FileServiceOptions };
export type { FsError, ResolveOptions } from '../utils/pathSecurity.js';