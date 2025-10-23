import type { FileServiceApi } from './FileService.js';
import type { FolderServiceApi } from './FolderService.js';
import { dirname } from 'path';

/**
 * CartridgeService — Knowledge module and documentation management
 *
 * Manages cartridges that can be loaded into AI agent sessions to provide
 * context, exemplars, and instructions. Supports path-based and ID-based
 * addressing with hash-based optimistic concurrency control.
 *
 * Follows project style: ESM-only, closure-based factory, frozen public API.
 */

/**
 * Structured error with code and optional data
 */
interface FsError extends Error {
    code: string;
    data?: unknown;
}

/**
 * Scope where cartridges are stored
 * - project: Project-specific cartridges, local to repository
 * - shared: User-level cartridges, shared across projects
 */
type Scope = 'project' | 'shared';

/**
 * Cartridge unique identifier format: crt{num}
 * Examples: crt001, crt002, crt123
 */
type CartridgeId = string;

/**
 * POSIX-style path within scope, no extension
 * Examples: "auth/jwt-setup", "testing/patterns"
 */
type CartridgePath = string;

/**
 * Path-based addressing (Method 1)
 * Specifies location within scope using filesystem-like path
 */
interface AddressPath {
    scope: Scope;
    path: CartridgePath;
    version?: string;
}

/**
 * Normalized path address (version stripped)
 * Used internally after validation
 */
interface NormalizedAddressPath {
    scope: Scope;
    path: CartridgePath;
}

/**
 * ID-based addressing (Method 2)
 * Specifies cartridge by unique identifier
 */
interface AddressId {
    scope: Scope;
    id: CartridgeId;
    version?: string;
}

/**
 * Discriminated union for addressing cartridges
 * Supports both path-based and ID-based addressing methods
 */
type CartridgeAddress =
    | ({ kind: 'path' } & AddressPath)
    | ({ kind: 'id' } & AddressId);

/**
 * Cartridge front matter fields (unenforced YAML)
 */
interface CartridgeFrontMatter {
    audience?: string;
    synopsis?: string;
    [key: string]: unknown;
}

/**
 * Result of front matter parsing
 */
interface FrontMatterParseResult {
    rawFrontMatter?: string;
    frontMatter?: CartridgeFrontMatter;
    bodyContent: string;
}

/**
 * Text replacement operations for editing cartridges
 * Atomic operations applied to latest version only
 */
type EditOp =
    | { op: 'replaceOnce'; oldText: string; newText: string }
    | { op: 'replaceAll'; oldText: string; newText: string }
    | { op: 'replaceRegex'; pattern: string; flags?: string; replacement: string }
    | { op: 'replaceAllContent'; content: string };

/**
 * Input for creating a new cartridge
 * Uses Method 1 (path-based) addressing only
 */
interface CreateCartridgeInput {
    address: { kind: 'path' } & Required<Omit<AddressPath, 'version'>>;
    content: string;
}

/**
 * Result of creating a cartridge
 */
interface CreateCartridgeResult {
    id: CartridgeId;
    hash: string;
    path: CartridgePath;
}

/**
 * Result of reading a cartridge
 */
interface ReadCartridgeResult {
    address: CartridgeAddress;
    content: string;
    hash: string;
    frontMatter?: CartridgeFrontMatter;
    bodyContent: string;
    path: CartridgePath;
    id: CartridgeId;
}

/**
 * Result of editing a cartridge
 */
interface EditCartridgeResult {
    newHash: string;
    applied: number;
}

/**
 * Result of deleting a cartridge
 */
interface DeleteCartridgeResult {
    deleted: boolean;
}

/**
 * List item for cartridge listing
 */
interface CartridgeListItem {
    scope: Scope;
    id: CartridgeId;
    path: CartridgePath;
    synopsis?: string;
    hash?: string;
    modifiedAt?: Date;
}

/**
 * Parameters for listing cartridges
 */
interface ListCartridgesParams {
    scope: Scope;
    pathPrefix?: string;
    includeContent?: boolean;
}

/**
 * Result of batch read operation
 */
interface MultiReadResult {
    results: ReadCartridgeResult[];
    errors: Array<{
        address: CartridgeAddress;
        error: FsError;
    }>;
}

/**
 * Path validation result
 */
interface PathValidationResult {
    valid: boolean;
    normalized?: CartridgePath;
    reason?: string;
}

/**
 * Cartridge-specific error codes
 * These extend the base FsError codes from FileService/FolderService
 */
type CartridgeErrorCode =
    | 'CARTRIDGE_NOT_FOUND'
    | 'CARTRIDGE_ALREADY_EXISTS'
    | 'INVALID_ID_FORMAT'
    | 'INVALID_PATH_FORMAT'
    | 'INVALID_SCOPE';

/**
 * Index file structure mapping IDs to paths
 * @internal
 */
interface IndexData {
    [id: string]: string;
}

/**
 * CartridgeService API
 * Manages cartridge lifecycle operations with hash-based concurrency control
 */
interface CartridgeServiceApi {
    /**
     * Validate cartridge ID format
     *
     * Checks if ID matches pattern: crt{num} where num is zero-padded to 3 digits
     * Examples: crt001, crt002, crt123
     *
     * @param id - Cartridge identifier to validate
     * @returns True if ID format is valid
     */
    validateId(id: string): boolean;

    /**
     * Validate and normalize cartridge path
     *
     * Validates:
     * - POSIX-style separators (forward slashes)
     * - No file extension
     * - No absolute paths or .. segments
     * - Valid characters for filesystem
     *
     * @param path - Path to validate and normalize
     * @returns Validation result with normalized path or error reason
     */
    validatePath(path: CartridgePath): PathValidationResult;

    /**
     * Normalize path-based address (no I/O)
     *
     * Validates and normalizes the path component
     * Ensures scope is valid
     * Strips version (for write operations)
     *
     * @param addr - Path-based address to normalize
     * @returns Normalized address with validated components
     * @throws {FsError} INVALID_SCOPE if scope is not 'project' or 'shared'
     * @throws {FsError} INVALID_PATH_FORMAT if path format is invalid
     */
    normalizePathAddress(addr: AddressPath): NormalizedAddressPath;

    /**
     * Resolve address to filesystem paths (with I/O)
     *
     * Converts logical address to absolute and relative filesystem paths
     * Handles both ID-based and path-based addressing
     * For ID-based: reads index to find canonical path
     *
     * @param addr - Cartridge address (path or ID based)
     * @returns Object with relative and absolute paths within boundary
     * @throws {FsError} CARTRIDGE_NOT_FOUND if ID not found in index
     * @throws {FsError} BOUNDARY_VIOLATION if resolved path escapes boundary
     */
    resolveAddress(addr: CartridgeAddress): Promise<{ rel: string; abs: string }>;

    /**
     * Generate next available ID for a scope
     *
     * Scans existing index to find highest ID and increments
     * Format: crt{num} where num is zero-padded to 3 digits
     *
     * @param scope - Scope to generate ID for
     * @returns Next available cartridge ID (e.g., "crt001", "crt042")
     * @throws {FsError} INVALID_SCOPE if scope is invalid
     */
    generateNextId(scope: Scope): Promise<CartridgeId>;

    /**
     * Create new cartridge
     *
     * Uses Method 1 (path-based) addressing
     * Generates unique ID automatically
     * Writes content atomically with hash verification
     *
     * @param input - Cartridge creation input with path and content
     * @returns Generated ID and content hash
     * @throws {FsError} CARTRIDGE_ALREADY_EXISTS if path already occupied
     * @throws {FsError} INVALID_PATH_FORMAT if path format is invalid
     * @throws {FsError} BOUNDARY_VIOLATION if path escapes boundary
     */
    create(input: CreateCartridgeInput): Promise<CreateCartridgeResult>;

    /**
     * Read cartridge content
     *
     * Supports both addressing methods (path and ID)
     * Optionally reads historical versions (if version specified)
     * Parses front matter if present (best-effort, never throws)
     *
     * @param addr - Cartridge address (supports version parameter)
     * @returns Complete cartridge data with parsed front matter
     * @throws {FsError} CARTRIDGE_NOT_FOUND if cartridge doesn't exist
     */
    read(addr: CartridgeAddress): Promise<ReadCartridgeResult>;

    /**
     * Edit latest version using optimistic concurrency
     *
     * Applies array of edit operations sequentially
     * Uses hash-based optimistic locking
     * Only operates on latest version (no version parameter allowed)
     *
     * @param addr - Cartridge address (without version)
     * @param baseHash - Expected current hash for concurrency control
     * @param edits - Array of edit operations to apply sequentially
     * @returns New hash and count of operations applied
     * @throws {FsError} HASH_MISMATCH if content changed since baseHash
     * @throws {FsError} CARTRIDGE_NOT_FOUND if cartridge doesn't exist
     * @throws {FsError} VALIDATION_ERROR if edit operations are invalid
     */
    editLatest(
        addr: Omit<CartridgeAddress, 'version'>,
        baseHash: string,
        edits: EditOp[]
    ): Promise<EditCartridgeResult>;

    /**
     * Delete cartridge from working copy
     *
     * Uses hash-based optimistic locking
     * Idempotent: returns {deleted: false} if already missing
     * Only operates on latest version
     * Historical versions remain in version control
     *
     * @param addr - Cartridge address (without version)
     * @param expectedHash - Expected hash for concurrency control
     * @returns Deletion result (idempotent when already missing)
     * @throws {FsError} HASH_MISMATCH if content changed since expectedHash
     * @throws {FsError} CARTRIDGE_NOT_FOUND if cartridge doesn't exist
     */
    deleteLatest(
        addr: Omit<CartridgeAddress, 'version'>,
        expectedHash: string
    ): Promise<DeleteCartridgeResult>;

    /**
     * List cartridges in a scope
     *
     * Returns all cartridges with synopsis from front matter
     * Optionally filters by path prefix
     * Results include hash for cache invalidation
     *
     * @param params - Scope and optional path prefix filter
     * @returns Array of cartridge list items with metadata
     * @throws {FsError} INVALID_SCOPE if scope is invalid
     */
    list(params: ListCartridgesParams): Promise<CartridgeListItem[]>;

    /**
     * Batch read multiple cartridges (AI workflow helper)
     *
     * Reads multiple cartridges in a single operation
     * Supports partial success (some reads may fail)
     * Useful for loading multiple cartridges into agent context
     *
     * @param addresses - Array of cartridge addresses to read
     * @returns Results and errors separately for partial success handling
     */
    multiread(addresses: CartridgeAddress[]): Promise<MultiReadResult>;
}

/**
 * Options for creating CartridgeService instance
 * Uses dependency injection for file/folder services
 */
interface CartridgeServiceOptions {
    fileService: FileServiceApi;
    folderService: FolderServiceApi;
    roots: {
        projectRoot: string;
        sharedRoot: string;
    };
    extension: string;
    indexFilename: string;
}

const ID_PATTERN = /^crt\d{3,}$/;
const FRONT_MATTER_DELIMITER = '---';

/**
 * Throw structured error with code
 * @internal
 */
const fail = (code: string, message: string, data?: unknown): never => {
    const err = new Error(message) as FsError;
    err.code = code;
    if (data !== undefined) {
        err.data = data;
    }
    throw err;
};

/**
 * Create a CartridgeService instance
 *
 * Closure-based factory pattern with frozen API
 * Validates options and initializes internal state
 *
 * @param options - Service configuration with injected dependencies
 * @returns Frozen CartridgeService API instance
 * @throws {FsError} VALIDATION_ERROR if options are invalid
 */
const create = (options: CartridgeServiceOptions): CartridgeServiceApi => {
    const { fileService, folderService, roots, extension, indexFilename } = options;
    const { projectRoot, sharedRoot } = roots;

    if (!extension.startsWith('.')) {
        fail('VALIDATION_ERROR', 'extension must start with a dot, e.g. ".md"', { extension });
    }

    /**
     * Get root path for a scope
     * @internal
     */
    const scopeToRoot = (scope: Scope): string => {
        if (scope === 'project') {
            return projectRoot;
        }
        if (scope === 'shared') {
            return sharedRoot;
        }
        return fail('INVALID_SCOPE', `Unknown scope '${scope}'`, { scope });
    };

    /**
     * Get index file path for a scope
     * @internal
     */
    const getIndexPath = (scope: Scope): string => {
        const root = scopeToRoot(scope);
        return `${root}/${indexFilename}`;
    };

    /**
     * Read index file with hash
     * Returns empty index if file doesn't exist
     * @internal
     */
    const readIndex = async (scope: Scope): Promise<{ index: IndexData; hash: string }> => {
        const indexPath = getIndexPath(scope);

        try {
            const { content, hash } = await fileService.readText(indexPath);
            const index = JSON.parse(content) as IndexData;
            return { index, hash };
        }
        catch (error: any) {
            // If index doesn't exist, return empty index
            if (error.code === 'NOT_FOUND') {
                return { index: {}, hash: '' };
            }
            throw error;
        }
    };

    /**
     * Write index file with hash verification
     * Retries once on HASH_MISMATCH (optimistic concurrency)
     * @internal
     */
    const writeIndex = async (
        scope: Scope,
        index: IndexData,
        baseHash: string
    ): Promise<{ hash: string }> => {
        const indexPath = getIndexPath(scope);
        const content = JSON.stringify(index, null, 2);

        try {
            const { newHash } = await fileService.writeTextAtomicIfUnchanged(
                indexPath,
                baseHash,
                content
            );
            return { hash: newHash };
        }
        catch (error: any) {
            if (error.code === 'HASH_MISMATCH') {
                const { index: freshIndex, hash: freshHash } = await readIndex(scope);
                const mergedIndex = { ...freshIndex, ...index };
                const mergedContent = JSON.stringify(mergedIndex, null, 2);
                const { newHash } = await fileService.writeTextAtomicIfUnchanged(
                    indexPath,
                    freshHash,
                    mergedContent
                );
                return { hash: newHash };
            }
            throw error;
        }
    };

    /**
     * Parse front matter from markdown content
     * Simple key: value parser (not full YAML)
     * @internal
     */
    const parseFrontMatter = (content: string): FrontMatterParseResult => {
        const lines = content.split('\n');

        if (lines.length < 3 || lines[0].trim() !== FRONT_MATTER_DELIMITER) {
            return { bodyContent: content };
        }

        let endIndex = -1;
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === FRONT_MATTER_DELIMITER) {
                endIndex = i;
                break;
            }
        }

        if (endIndex === -1) {
            return { bodyContent: content };
        }

        const fmLines = lines.slice(1, endIndex);
        const rawFrontMatter = lines.slice(0, endIndex + 1).join('\n');
        const bodyContent = lines.slice(endIndex + 1).join('\n').trim();

        const unquote = (v: string): string => {
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
                return v.slice(1, -1);
            }
            return v;
        };

        const frontMatter: CartridgeFrontMatter = {};
        for (const line of fmLines) {
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) {
                continue;
            }

            const key = line.slice(0, colonIndex).trim();
            const value = line.slice(colonIndex + 1).trim();

            frontMatter[key] = unquote(value);
        }

        return {
            rawFrontMatter,
            frontMatter: Object.keys(frontMatter).length > 0 ? frontMatter : undefined,
            bodyContent
        };
    };

    /**
     * Apply a single edit operation to content
     * @internal
     */
    const applyEditOp = (content: string, edit: EditOp): { newContent: string; applied: boolean } => {
        switch (edit.op) {
            case 'replaceOnce': {
                const { oldText, newText } = edit;
                if (!content.includes(oldText)) {
                    return { newContent: content, applied: false };
                }
                return { newContent: content.replace(oldText, newText), applied: true };
            }

            case 'replaceAll': {
                const { oldText, newText } = edit;
                if (!content.includes(oldText)) {
                    return { newContent: content, applied: false };
                }
                const regex = new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                return { newContent: content.replace(regex, newText), applied: true };
            }

            case 'replaceRegex': {
                const { pattern, flags, replacement } = edit;
                const regex = new RegExp(pattern, flags);
                if (!regex.test(content)) {
                    return { newContent: content, applied: false };
                }
                return { newContent: content.replace(regex, replacement), applied: true };
            }

            case 'replaceAllContent': {
                const { content: newContent } = edit;
                return { newContent, applied: true };
            }

            default: {
                const _exhaustive: never = edit;
                return fail('VALIDATION_ERROR', `Unknown edit operation: ${JSON.stringify(_exhaustive)}`);
            }
        }
    };

    /**
     * Validate cartridge ID format
     * @internal
     */
    const validateId = (id: string): boolean => {
        return ID_PATTERN.test(id);
    };

    /**
     * Validate and normalize cartridge path
     * @internal
     */
    const validatePath = (path: CartridgePath): PathValidationResult => {
        if (!path || path.trim().length === 0) {
            return { valid: false, reason: 'Path cannot be empty' };
        }

        if (path.startsWith('/')) {
            return { valid: false, reason: 'Path must be relative (no leading slash)' };
        }

        if (path.includes('..')) {
            return { valid: false, reason: 'Path cannot contain ".." segments' };
        }

        const normalized = path.replace(/\\/g, '/');
        const trimmed = normalized.replace(/^\/+|\/+$/g, '');

        if (/[<>:"|?*\0]/.test(trimmed)) {
            return { valid: false, reason: 'Path contains invalid characters' };
        }

        return { valid: true, normalized: trimmed };
    };

    /**
     * Normalize path-based address
     * @internal
     */
    const normalizePathAddress = (addr: AddressPath): NormalizedAddressPath => {
        const { scope, path } = addr;

        if (scope !== 'project' && scope !== 'shared') {
            fail('INVALID_SCOPE', `Scope must be 'project' or 'shared', got '${scope}'`, { scope });
        }

        const pathResult = validatePath(path);
        if (!pathResult.valid) {
            fail('INVALID_PATH_FORMAT', pathResult.reason!, { path });
        }

        return {
            scope,
            path: pathResult.normalized!
        };
    };

    /**
     * Resolve address to filesystem paths
     * @internal
     */
    const resolveAddress = async (addr: CartridgeAddress): Promise<{ rel: string; abs: string }> => {
        const { scope } = addr;
        const root = scopeToRoot(scope);

        let cartridgePath: string;

        if (addr.kind === 'path') {
            // Path-based addressing: use path directly
            const normalized = normalizePathAddress(addr);
            cartridgePath = normalized.path;
        }
        else {
            // ID-based addressing: lookup in index
            const { id } = addr;

            if (!validateId(id)) {
                fail('INVALID_ID_FORMAT', `ID must match pattern crt\\d{3,}, got '${id}'`, { id });
            }

            const { index } = await readIndex(scope);

            if (!index[id]) {
                fail('CARTRIDGE_NOT_FOUND', `No cartridge with ID '${id}' in scope '${scope}'`, { id, scope });
            }

            cartridgePath = index[id];
        }

        // Construct full path with extension
        const relativePath = `${root}/${cartridgePath}${extension}`;

        // Resolve using folder service
        const resolved = await folderService.resolve(relativePath);

        return resolved;
    };

    /**
     * Generate next available ID for a scope
     * @internal
     */
    const generateNextId = async (scope: Scope): Promise<CartridgeId> => {
        if (scope !== 'project' && scope !== 'shared') {
            fail('INVALID_SCOPE', `Scope must be 'project' or 'shared', got '${scope}'`, { scope });
        }

        const { index } = await readIndex(scope);

        let maxNum = 0;
        for (const id of Object.keys(index)) {
            const match = id.match(/^crt(\d{3,})$/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) {
                    maxNum = num;
                }
            }
        }

        const nextNum = maxNum + 1;
        const nextId = `crt${nextNum.toString().padStart(3, '0')}`;

        return nextId;
    };

    /**
     * Create new cartridge
     * @internal
     */
    const createCartridge = async (input: CreateCartridgeInput): Promise<CreateCartridgeResult> => {
        const { address, content } = input;

        if (address.kind !== 'path') {
            fail('VALIDATION_ERROR', 'Create requires path-based addressing');
        }

        const normalized = normalizePathAddress(address);
        const { scope, path } = normalized;

        const id = await generateNextId(scope);

        const root = scopeToRoot(scope);
        const relativePath = `${root}/${path}${extension}`;

        const exists = await fileService.exists(relativePath);
        if (exists) {
            fail('CARTRIDGE_ALREADY_EXISTS', `Cartridge already exists at path '${path}'`, { path, scope });
        }

        const parentPath = `${root}/${dirname(path)}`;
        await folderService.ensureDir(parentPath);

        const { newHash } = await fileService.writeTextAtomicIfUnchanged(
            relativePath,
            '',
            content
        );

        const { index, hash: indexHash } = await readIndex(scope);
        index[id] = path;
        await writeIndex(scope, index, indexHash);

        return {
            id,
            hash: newHash,
            path
        };
    };

    /**
     * Read cartridge content
     * @internal
     */
    const readCartridge = async (addr: CartridgeAddress): Promise<ReadCartridgeResult> => {
        // Resolve address to file path
        const { rel: relativePath } = await resolveAddress(addr);

        // Read file content
        const { content, hash } = await fileService.readText(relativePath);

        // Parse front matter
        const { frontMatter, bodyContent, rawFrontMatter } = parseFrontMatter(content);

        // Determine canonical path and ID
        let canonicalPath: string;
        let canonicalId: string;

        if (addr.kind === 'path') {
            const normalized = normalizePathAddress(addr);
            canonicalPath = normalized.path;

            // Lookup ID from index
            const { index } = await readIndex(addr.scope);
            const foundId = Object.keys(index).find(id => index[id] === canonicalPath);
            if (!foundId) {
                return fail('CARTRIDGE_NOT_FOUND', `Cartridge exists but not in index: '${canonicalPath}'`, { path: canonicalPath, scope: addr.scope });
            }
            canonicalId = foundId;
        }
        else if (addr.kind === 'id') {
            canonicalId = addr.id;

            // Lookup path from index
            const { index } = await readIndex(addr.scope);
            const foundPath = index[canonicalId];
            if (!foundPath) {
                return fail('CARTRIDGE_NOT_FOUND', `No cartridge with ID '${canonicalId}'`, { id: canonicalId, scope: addr.scope });
            }
            canonicalPath = foundPath;
        }
        else {
            const _exhaustive: never = addr;
            return fail('VALIDATION_ERROR', `Unknown address kind: ${JSON.stringify(_exhaustive)}`);
        }

        return {
            address: addr,
            content,
            hash,
            frontMatter,
            bodyContent,
            path: canonicalPath,
            id: canonicalId
        };
    };

    /**
     * Edit latest version using optimistic concurrency
     * @internal
     */
    const editLatest = async (
        addr: Omit<CartridgeAddress, 'version'>,
        baseHash: string,
        edits: EditOp[]
    ): Promise<EditCartridgeResult> => {
        // Resolve address to file path
        const { rel: relativePath } = await resolveAddress(addr as CartridgeAddress);

        // Read current content
        const { content: currentContent, hash: currentHash } = await fileService.readText(relativePath);

        if (currentHash !== baseHash) {
            fail('HASH_MISMATCH', `Expected hash '${baseHash}', got '${currentHash}'`, { expected: baseHash, actual: currentHash });
        }

        // Apply edits sequentially
        let newContent = currentContent;
        let appliedCount = 0;

        for (const edit of edits) {
            const { newContent: updated, applied } = applyEditOp(newContent, edit);
            newContent = updated;
            if (applied) {
                appliedCount++;
            }
        }

        // If no changes, return current hash
        if (appliedCount === 0) {
            return { newHash: currentHash, applied: 0 };
        }

        // Write updated content
        const { newHash } = await fileService.writeTextAtomicIfUnchanged(
            relativePath,
            currentHash,
            newContent
        );

        return { newHash, applied: appliedCount };
    };

    /**
     * Delete cartridge from working copy
     * @internal
     */
    const deleteLatest = async (
        addr: Omit<CartridgeAddress, 'version'>,
        expectedHash: string
    ): Promise<DeleteCartridgeResult> => {
        // Resolve cartridge ID from address
        // Note: TypeScript doesn't properly narrow Omit<discriminated union>, so we use type assertions
        const cartridgeId = await (async (): Promise<string> => {
            if (addr.kind === 'id') {
                return (addr as Omit<AddressId, 'version'>).id;
            }
            else if (addr.kind === 'path') {
                const pathAddr = addr as Omit<AddressPath, 'version'>;
                const normalized = normalizePathAddress(pathAddr as AddressPath);
                const { index } = await readIndex(pathAddr.scope);
                const foundId = Object.keys(index).find(id => index[id] === normalized.path);
                if (!foundId) {
                    return fail('CARTRIDGE_NOT_FOUND', `Cartridge not in index: '${normalized.path}'`, { path: normalized.path, scope: pathAddr.scope });
                }
                return foundId;
            }
            else {
                const _exhaustive: never = addr as never;
                return fail('VALIDATION_ERROR', `Unknown address kind: ${JSON.stringify(_exhaustive)}`);
            }
        })();

        const { rel: relativePath } = await resolveAddress(addr as CartridgeAddress);

        let deleted = false;
        try {
            const result = await fileService.deleteIfUnchanged(relativePath, expectedHash);
            deleted = result.deleted;
        }
        catch (error: any) {
            if (error.code === 'NOT_FOUND') {
                deleted = false;
            }
            else {
                throw error;
            }
        }

        // Always update index to remove stale entries
        const { index, hash: indexHash } = await readIndex(addr.scope);
        if (index[cartridgeId]) {
            delete index[cartridgeId];
            await writeIndex(addr.scope, index, indexHash);
        }

        return { deleted };
    };

    /**
     * List cartridges in a scope
     * @internal
     */
    const listCartridges = async (params: ListCartridgesParams): Promise<CartridgeListItem[]> => {
        const { scope, pathPrefix, includeContent = false } = params;

        if (scope !== 'project' && scope !== 'shared') {
            fail('INVALID_SCOPE', `Scope must be 'project' or 'shared', got '${scope}'`, { scope });
        }

        const { index } = await readIndex(scope);
        const items: CartridgeListItem[] = [];
        const root = scopeToRoot(scope);

        for (const [id, path] of Object.entries(index)) {
            if (pathPrefix && !path.startsWith(pathPrefix)) {
                continue;
            }

            const relativePath = `${root}/${path}${extension}`;

            try {
                if (includeContent) {
                    const { content, hash } = await fileService.readText(relativePath);
                    const stats = await fileService.stat(relativePath);
                    const { frontMatter } = parseFrontMatter(content);

                    items.push({
                        scope,
                        id,
                        path,
                        synopsis: frontMatter?.synopsis as string | undefined,
                        hash,
                        modifiedAt: stats.mtime
                    });
                }
                else {
                    const stats = await fileService.stat(relativePath);

                    items.push({
                        scope,
                        id,
                        path,
                        modifiedAt: stats.mtime
                    });
                }
            }
            catch (error: any) {
                continue;
            }
        }

        return items;
    };

    /**
     * Batch read multiple cartridges
     * @internal
     */
    const multiread = async (addresses: CartridgeAddress[]): Promise<MultiReadResult> => {
        const results: ReadCartridgeResult[] = [];
        const errors: Array<{ address: CartridgeAddress; error: FsError }> = [];

        for (const address of addresses) {
            try {
                const result = await readCartridge(address);
                results.push(result);
            }
            catch (error: any) {
                errors.push({ address, error: error as FsError });
            }
        }

        return { results, errors };
    };

    return Object.freeze({
        validateId,
        validatePath,
        normalizePathAddress,
        resolveAddress,
        generateNextId,
        create: createCartridge,
        read: readCartridge,
        editLatest,
        deleteLatest,
        list: listCartridges,
        multiread
    });
};

/**
 * CartridgeService module
 *
 * Provides operations for managing knowledge cartridges:
 * - Create: Generate new cartridges with auto-assigned IDs
 * - Read: Access cartridges by path or ID
 * - Edit: Apply text transformations with optimistic locking
 * - Delete: Remove from working copy (preserves history)
 * - List: Enumerate cartridges with metadata
 *
 * ## Storage Structure
 *
 * Cartridges are stored as markdown files organized by scope:
 * ```
 * project/cartridges/
 *   .index.json              # Maps IDs to paths: { "crt001": "auth/jwt" }
 *   auth/jwt-setup.md        # Cartridge content
 *   testing/patterns.md      # Cartridge content
 *
 * shared/cartridges/
 *   .index.json              # Shared scope index
 *   workflows/tdd.md         # Shared cartridge
 * ```
 *
 * ## Addressing Methods
 *
 * **Method 1: Path-based**
 * ```typescript
 * { kind: 'path', scope: 'project', path: 'auth/jwt-setup' }
 * ```
 *
 * **Method 2: ID-based**
 * ```typescript
 * { kind: 'id', scope: 'project', id: 'crt001' }
 * ```
 *
 * ## Concurrency Control
 *
 * Edit and delete operations use hash-based optimistic locking:
 * - Read cartridge to get current hash
 * - Perform operation with hash as expectedHash/baseHash
 * - Operation fails with HASH_MISMATCH if content changed
 *
 * ## Front Matter
 *
 * Optional YAML front matter (simple key: value parsing):
 * ```yaml
 * ---
 * audience: developers
 * synopsis: Brief description
 * ---
 * ```
 *
 * ## Version Support
 *
 * API includes version parameter for future historical access
 * Current implementation operates on latest version only
 *
 * @module CartridgeService
 */
const CartridgeService = Object.freeze({
    create
});

export default CartridgeService;
export type {
    CartridgeServiceApi,
    CartridgeServiceOptions,
    CartridgeFrontMatter,
    FrontMatterParseResult,
    CartridgeAddress,
    AddressPath,
    AddressId,
    NormalizedAddressPath,
    EditOp,
    CreateCartridgeInput,
    CreateCartridgeResult,
    ReadCartridgeResult,
    EditCartridgeResult,
    DeleteCartridgeResult,
    CartridgeListItem,
    ListCartridgesParams,
    MultiReadResult,
    PathValidationResult,
    CartridgeErrorCode,
    FsError,
    Scope,
    CartridgeId,
    CartridgePath
};
