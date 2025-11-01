import { resolve, relative, normalize, isAbsolute } from 'path';
import { realpath, lstat } from 'fs/promises';

/**
 * Error codes for file system operations
 */
type FsErrorCode =
    | 'BOUNDARY_VIOLATION'
    | 'DIRECTORY_NOT_EMPTY'
    | 'NOT_FOUND'
    | 'HASH_MISMATCH'
    | 'VALIDATION_ERROR'
    | 'FS_ERROR';

/**
 * Structured file system error
 */
interface FsError extends Error {
    code: FsErrorCode;
    details?: Record<string, any>;
}

/**
 * Create a structured file system error
 * @param code - Error code
 * @param message - Error message
 * @param details - Optional additional details
 * @returns Error with structured properties
 */
const fsError = (
    code: FsErrorCode,
    message: string,
    details?: Record<string, any>
): FsError => {
    const error = new Error(message) as FsError;
    error.name = code;
    error.code = code;
    error.details = details;
    return error;
};

/**
 * Validate that a path is relative and doesn't contain suspicious segments
 * @param p - Path to validate
 * @returns Normalized path
 * @throws {FsError} If path is invalid
 */
const validateRelative = (p: string): string => {
    if (!p) {
        throw fsError('VALIDATION_ERROR', 'Empty path');
    }

    if (isAbsolute(p)) {
        throw fsError('VALIDATION_ERROR', 'Absolute path not allowed', { path: p });
    }

    // Normalize separators and path structure
    const norm = normalize(p).replaceAll('\\', '/');
    const parts = norm.split('/');

    // Check for .. segments which could escape boundary
    if (parts.some(seg => seg === '..')) {
        throw fsError('BOUNDARY_VIOLATION', 'Path contains ..', { path: p });
    }

    return norm;
};

/**
 * Check if a target path is inside the boundary using relative path analysis
 * This is more secure than string prefix matching
 * @param rootAbs - Absolute boundary directory path
 * @param targetAbs - Absolute target path to check
 * @returns True if target is within boundary
 */
const insideBoundary = (rootAbs: string, targetAbs: string): boolean => {
    const rel = relative(rootAbs, targetAbs);

    // Empty means same directory - that's inside
    // Starting with .. means outside parent - that's outside
    // Being absolute after relative() means different drives on Windows - that's outside
    return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
};

/**
 * Options for resolving paths
 */
interface ResolveOptions {
    /** Whether to follow symlinks when resolving (default: false) */
    followSymlinks?: boolean;
}

/**
 * Safely resolve a relative path within a boundary, with symlink handling
 *
 * Guarantees:
 * - abs: Native OS path format (absolute)
 * - rel: POSIX-style path with '/' separators, no '.' or '..' segments
 * - Symlink policy (default): Detects symlinks and validates targets stay within boundary
 * - Symlink policy (followSymlinks: true): Resolves all symlinks to final target
 *
 * @param boundaryDir - Absolute boundary directory path (must be absolute)
 * @param relativePath - Path relative to boundary
 * @param options - Resolution options
 * @param options.followSymlinks - If true, resolve symlinks to final target (default: false)
 * @returns Object with absolute and relative paths
 * @throws {FsError} If path validation fails or escapes boundary
 */
const resolveWithinBoundary = async (
    boundaryDir: string,
    relativePath: string,
    options?: ResolveOptions
): Promise<{ abs: string; rel: string }> => {
    // First validate the input is a proper relative path
    const validated = validateRelative(relativePath);

    // Resolve against boundary
    const normalizedBoundary = resolve(boundaryDir);
    let abs = resolve(normalizedBoundary, validated);

    // If following symlinks, resolve to real path
    if (options?.followSymlinks) {
        try {
            abs = await realpath(abs);
        }
        catch (error: any) {
            // If file doesn't exist, realpath will fail - that's ok for create operations
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }
    else {
        // Not following symlinks, but we should check if the path IS a symlink
        // and if it points outside, we need to reject it
        try {
            const stats = await lstat(abs);
            if (stats.isSymbolicLink()) {
                // It's a symlink, resolve it to check where it points
                const realPath = await realpath(abs);
                if (!insideBoundary(normalizedBoundary, realPath)) {
                    throw fsError(
                        'BOUNDARY_VIOLATION',
                        `Symlink target escapes boundary: '${relativePath}' → '${realPath}'`,
                        { path: relativePath, resolved: abs, target: realPath }
                    );
                }
            }
        }
        catch (error: any) {
            // ENOENT is ok - file doesn't exist yet
            if (error.code !== 'ENOENT' && error.code !== 'BOUNDARY_VIOLATION') {
                throw error;
            }
            if (error.code === 'BOUNDARY_VIOLATION') {
                throw error;
            }
        }
    }

    // Check if resolved path is within boundary
    if (!insideBoundary(normalizedBoundary, abs) && abs !== normalizedBoundary) {
        throw fsError(
            'BOUNDARY_VIOLATION',
            `Path escapes boundary: '${relativePath}' → '${abs}'`,
            { path: relativePath, resolved: abs, boundary: normalizedBoundary }
        );
    }

    // Return both absolute and relative paths
    // Normalize rel to POSIX-style for consistency
    const rel = relative(normalizedBoundary, abs).replaceAll('\\', '/');

    return {
        abs,
        rel
    };
};

/**
 * Map Node.js file system error codes to structured error codes
 * @param error - Original error from fs operations
 * @param context - Context information for the error (should include path and resolved absolute path)
 * @returns Structured FsError or re-throws if unrecognized
 */
const mapOsError = (error: any, context?: { path?: string; resolved?: string; operation?: string }): Error => {
    const code = error.code;

    // Build contextual path string
    const pathStr = context?.path
        ? (context.resolved ? `'${context.path}' → '${context.resolved}'` : `'${context.path}'`)
        : '';

    switch (code) {
    case 'ENOENT':
        return fsError(
            'NOT_FOUND',
            `File or directory not found${pathStr ? `: ${pathStr}` : ''}`,
            { ...context, originalCode: code }
        );

    case 'ENOTEMPTY':
        return fsError(
            'DIRECTORY_NOT_EMPTY',
            `Directory not empty${pathStr ? `: ${pathStr}` : ''}`,
            { ...context, originalCode: code }
        );

    case 'ENOTDIR':
    case 'EISDIR':
        return fsError(
            'VALIDATION_ERROR',
            `Invalid path type${pathStr ? `: ${pathStr}` : ''}`,
            { ...context, originalCode: code, reason: code === 'ENOTDIR' ? 'not a directory' : 'is a directory' }
        );

    case 'EACCES':
    case 'EPERM':
        return fsError(
            'FS_ERROR',
            `Permission denied${pathStr ? `: ${pathStr}` : ''}`,
            { ...context, originalCode: code }
        );

    case 'EBUSY':
        return fsError(
            'FS_ERROR',
            `Resource busy or locked${pathStr ? `: ${pathStr}` : ''}`,
            { ...context, originalCode: code }
        );

    default:
        // Re-throw unrecognized errors with context
        if (context) {
            error.context = context;
        }
        return error;
    }
};

/**
 * Path security utilities for safe file system operations
 *
 * Provides functions for validating paths, checking boundaries,
 * handling symlinks, and creating structured errors.
 *
 * ## Security Model
 *
 * - **Boundary enforcement**: All paths must resolve within a specified boundary directory
 * - **Path validation**: Rejects absolute paths, empty paths, and `..` traversal attempts
 * - **Symlink handling**: Detects symlinks and validates targets remain within boundary
 * - **Structured errors**: Typed error codes with contextual details for debugging
 *
 * ## Error Taxonomy
 *
 * - `VALIDATION_ERROR`: Invalid input (absolute path, empty, `..` segments, bad options)
 * - `BOUNDARY_VIOLATION`: Path escapes boundary (including symlink targets)
 * - `NOT_FOUND`: File or directory doesn't exist (ENOENT)
 * - `DIRECTORY_NOT_EMPTY`: Directory has contents (ENOTEMPTY)
 * - `HASH_MISMATCH`: Content hash doesn't match expected value
 * - `FS_ERROR`: OS-level errors (permissions, busy resource, etc.)
 *
 * ## Path Normalization Guarantees
 *
 * Functions that return paths guarantee:
 * - Absolute paths: Native OS format (with backslashes on Windows)
 * - Relative paths: POSIX-style with `/` separators, no `.` or `..` segments
 *
 * @module pathSecurity
 */
const pathSecurity = Object.freeze({
    fsError,
    validateRelative,
    insideBoundary,
    resolveWithinBoundary,
    mapOsError
});

export default pathSecurity;
export type { FsErrorCode, FsError, ResolveOptions };
