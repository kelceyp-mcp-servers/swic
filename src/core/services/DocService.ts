import type { FileServiceApi } from './FileService.js';
import type { FolderServiceApi } from './FolderService.js';
import docAddressResolver, { detectScopeFromId } from '../utils/DocAddressResolver.js';
import { dirname } from 'path';

/**
 * docService — Knowledge module and documentation management
 *
 * Manages docs that can be loaded into AI agent sessions to provide
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
 * Scope where docs are stored
 * - project: Project-specific docs, local to repository
 * - shared: User-level docs, shared across projects
 */
type Scope = 'project' | 'shared';

/**
 * doc unique identifier formats:
 * - Project docs: doc{num} (e.g., doc001, doc002, doc123)
 * - Shared docs: sdoc{num} (e.g., sdoc001, sdoc002, sdoc123)
 *
 * The prefix disambiguates scope, eliminating ID collisions between scopes.
 */
type ProjectdocId = `doc${string}`;
type ShareddocId = `sdoc${string}`;
type docId = ProjectdocId | ShareddocId;

/**
 * POSIX-style path within scope, no extension
 * Examples: "auth/jwt-setup", "testing/patterns"
 */
type docPath = string;

/**
 * Path-based addressing (Method 1)
 * Specifies location within scope using filesystem-like path
 *
 * Scope is optional:
 * - If provided: use specified scope
 * - If omitted: check project scope first, then shared scope
 */
interface AddressPath {
    scope?: Scope;
    path: docPath;
    version?: string;
}

/**
 * Normalized path address (version stripped)
 * Used internally after validation
 */
interface NormalizedAddressPath {
    scope: Scope;
    path: docPath;
}

/**
 * ID-based addressing (Method 2)
 * Specifies doc by unique identifier
 *
 * Scope is optional:
 * - If provided: use specified scope
 * - If omitted: infer from ID prefix (doc### = project, sdoc### = shared)
 */
interface AddressId {
    scope?: Scope;
    id: docId;
    version?: string;
}

/**
 * Discriminated union for addressing docs
 * Supports both path-based and ID-based addressing methods
 */
type docAddress =
    | ({ kind: 'path' } & AddressPath)
    | ({ kind: 'id' } & AddressId);

/**
 * doc front matter fields (unenforced YAML)
 */
interface docFrontMatter {
    audience?: string;
    synopsis?: string;
    [key: string]: unknown;
}

/**
 * Result of front matter parsing
 */
interface FrontMatterParseResult {
    rawFrontMatter?: string;
    frontMatter?: docFrontMatter;
    bodyContent: string;
}

/**
 * Text replacement operations for editing docs
 * Atomic operations applied to latest version only
 */
type EditOp =
    | { op: 'replaceOnce'; oldText: string; newText: string }
    | { op: 'replaceAll'; oldText: string; newText: string }
    | { op: 'replaceRegex'; pattern: string; flags?: string; replacement: string }
    | { op: 'replaceAllContent'; content: string };

/**
 * Input for creating a new doc
 * Uses Method 1 (path-based) addressing only
 *
 * Scope is optional:
 * - If provided: create in specified scope
 * - If omitted: defaults to 'project' scope
 */
interface CreatedocInput {
    address: { kind: 'path' } & Omit<AddressPath, 'version'>;
    content: string;
}

/**
 * Result of creating a doc
 */
interface CreatedocResult {
    id: docId;
    hash: string;
    path: docPath;
}

/**
 * Result of reading a doc
 */
interface ReaddocResult {
    address: docAddress;
    content: string;
    hash: string;
    frontMatter?: docFrontMatter;
    bodyContent: string;
    path: docPath;
    id: docId;
}

/**
 * Result of editing a doc
 */
interface EditdocResult {
    newHash: string;
    applied: number;
}

/**
 * Result of deleting a doc
 */
interface DeletedocResult {
    deleted: boolean;
}

/**
 * List item for doc listing
 */
interface docListItem {
    scope: Scope;
    id: docId;
    path: docPath;
    synopsis?: string;
    hash?: string;
    modifiedAt?: Date;
    /**
     * Override status when same path exists in both scopes:
     * - 'overrides': Project doc that shadows a shared doc
     * - 'overridden': Shared doc that is shadowed by a project doc
     * - undefined: No conflict, or single-scope listing
     */
    override?: 'overrides' | 'overridden';
}

/**
 * Parameters for listing docs
 *
 * Scope is optional:
 * - If provided: list only docs in that scope
 * - If omitted: list docs from both scopes with override detection
 */
interface ListdocsParams {
    scope?: Scope;
    pathPrefix?: string;
    includeContent?: boolean;
}

/**
 * Path validation result
 */
interface PathValidationResult {
    valid: boolean;
    normalized?: docPath;
    reason?: string;
}

/**
 * doc-specific error codes
 * These extend the base FsError codes from FileService/FolderService
 */
type docErrorCode =
    | 'doc_NOT_FOUND'
    | 'doc_ALREADY_EXISTS'
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
 * docService API
 * Manages doc lifecycle operations with hash-based concurrency control
 */
interface DocServiceApi {
    /**
     * Create new doc
     *
     * Uses Method 1 (path-based) addressing
     * Generates unique ID automatically
     * Writes content atomically with hash verification
     *
     * @param input - doc creation input with path and content
     * @returns Generated ID and content hash
     * @throws {FsError} doc_ALREADY_EXISTS if path already occupied
     * @throws {FsError} INVALID_PATH_FORMAT if path format is invalid
     * @throws {FsError} BOUNDARY_VIOLATION if path escapes boundary
     */
    create(input: CreatedocInput): Promise<CreatedocResult>;

    /**
     * Read doc content
     *
     * Supports both addressing methods (path and ID)
     * Optionally reads historical versions (if version specified)
     * Parses front matter if present (best-effort, never throws)
     *
     * @param addr - doc address (supports version parameter)
     * @returns Complete doc data with parsed front matter
     * @throws {FsError} doc_NOT_FOUND if doc doesn't exist
     */
    read(addr: docAddress): Promise<ReaddocResult>;

    /**
     * Edit latest version using optimistic concurrency
     *
     * Applies array of edit operations sequentially
     * Uses hash-based optimistic locking
     * Only operates on latest version (no version parameter allowed)
     *
     * @param addr - doc address (without version)
     * @param baseHash - Expected current hash for concurrency control
     * @param edits - Array of edit operations to apply sequentially
     * @returns New hash and count of operations applied
     * @throws {FsError} HASH_MISMATCH if content changed since baseHash
     * @throws {FsError} doc_NOT_FOUND if doc doesn't exist
     * @throws {FsError} VALIDATION_ERROR if edit operations are invalid
     */
    editLatest(
        addr: Omit<docAddress, 'version'>,
        baseHash: string,
        edits: EditOp[]
    ): Promise<EditdocResult>;

    /**
     * Delete doc from working copy
     *
     * Uses hash-based optimistic locking
     * Idempotent: returns {deleted: false} if already missing
     * Only operates on latest version
     * Historical versions remain in version control
     *
     * @param addr - doc address (without version)
     * @param expectedHash - Expected hash for concurrency control
     * @returns Deletion result (idempotent when already missing)
     * @throws {FsError} HASH_MISMATCH if content changed since expectedHash
     * @throws {FsError} doc_NOT_FOUND if doc doesn't exist
     */
    deleteLatest(
        addr: Omit<docAddress, 'version'>,
        expectedHash: string
    ): Promise<DeletedocResult>;

    /**
     * List docs in a scope
     *
     * Returns all docs with synopsis from front matter
     * Optionally filters by path prefix
     * Results include hash for cache invalidation
     *
     * @param params - Scope and optional path prefix filter
     * @returns Array of doc list items with metadata
     * @throws {FsError} INVALID_SCOPE if scope is invalid
     */
    list(params: ListdocsParams): Promise<docListItem[]>;
}

/**
 * Options for creating docService instance
 * Uses dependency injection for file/folder services by scope
 */
interface docServiceOptions {
    fileServiceByScope: {
        project: FileServiceApi;
        shared: FileServiceApi;
    };
    folderServiceByScope: {
        project: FolderServiceApi;
        shared: FolderServiceApi;
    };
    indexFilename: string;
}

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
 * Create a docService instance
 *
 * Closure-based factory pattern with frozen API
 * Validates options and initializes internal state
 *
 * @param options - Service configuration with injected dependencies
 * @returns Frozen docService API instance
 * @throws {FsError} VALIDATION_ERROR if options are invalid
 */
const create = (options: docServiceOptions): DocServiceApi => {
    const { fileServiceByScope, folderServiceByScope, indexFilename } = options;

    /**
     * Get file service for a scope
     * @internal
     */
    const getFileService = (scope: Scope): FileServiceApi => {
        if (scope === 'project') {
            return fileServiceByScope.project;
        }
        if (scope === 'shared') {
            return fileServiceByScope.shared;
        }
        return fail('INVALID_SCOPE', `Unknown scope '${scope}'`, { scope });
    };

    /**
     * Get folder service for a scope
     * @internal
     */
    const getFolderService = (scope: Scope): FolderServiceApi => {
        if (scope === 'project') {
            return folderServiceByScope.project;
        }
        if (scope === 'shared') {
            return folderServiceByScope.shared;
        }
        return fail('INVALID_SCOPE', `Unknown scope '${scope}'`, { scope });
    };

    /**
     * Resolve scope for an address
     *
     * Handles optional scope resolution:
     * - If scope provided explicitly: use it
     * - For ID-based: detect from prefix (doc### = project, sdoc### = shared)
     * - For path-based: try project first, then shared
     *
     * @internal
     */
    const resolveScopeForAddress = async (addr: docAddress): Promise<{ scope: Scope; fallback?: boolean }> => {
        // Explicit scope provided
        if (addr.scope) {
            return { scope: addr.scope };
        }

        // ID-based: detect from prefix
        if (addr.kind === 'id') {
            const detectedScope = detectScopeFromId(addr.id);
            if (!detectedScope) {
                fail('INVALID_ID_FORMAT', `Invalid doc ID format: '${addr.id}'. Expected docNNN or sdocNNN`, { id: addr.id });
            }
            return { scope: detectedScope! };
        }

        // Path-based: try project first, then shared
        if (addr.kind === 'path') {
            // Check if exists in project scope
            try {
                const projectIndex = await readIndex('project');
                // Look for doc by path in project index
                const projectEntry = Object.entries(projectIndex.index).find(([_, p]) => p === addr.path);
                if (projectEntry) {
                    return { scope: 'project' };
                }
            }
            catch {
                // Project index doesn't exist or error reading - fall through to shared
            }

            // Check if exists in shared scope
            try {
                const sharedIndex = await readIndex('shared');
                const sharedEntry = Object.entries(sharedIndex.index).find(([_, p]) => p === addr.path);
                if (sharedEntry) {
                    return { scope: 'shared', fallback: true };
                }
            }
            catch {
                // Shared index doesn't exist or error reading
            }

            // Not found in either scope - default to project for create operations
            // For read/edit/delete operations, this will fail with NOT_FOUND later
            return { scope: 'project' };
        }

        // Should never reach here due to discriminated union
        const _exhaustive: never = addr;
        return fail('VALIDATION_ERROR', `Unknown address kind: ${JSON.stringify(_exhaustive)}`);
    };

    /**
     * Get index file path for a scope
     * @internal
     */
    const getIndexPath = (_scope: Scope): string => {
        return indexFilename;
    };

    /**
     * Read index file with hash
     * Returns empty index if file doesn't exist
     * @internal
     */
    const readIndex = async (scope: Scope): Promise<{ index: IndexData; hash: string }> => {
        const indexPath = getIndexPath(scope);
        const fileService = getFileService(scope);

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
        const fileService = getFileService(scope);
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

        const frontMatter: docFrontMatter = {};
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
     * Validate doc ID format
     * Accepts both project (doc###) and shared (sdoc###) formats
     * @internal
     */
    const validateId = (id: string): boolean => {
        return docAddressResolver.isdocId(id);
    };

    /**
     * Validate and normalize doc path
     * @internal
     */
    const validatePath = (path: docPath): PathValidationResult => {
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
     * Note: This assumes scope is already resolved and present
     * @internal
     */
    const normalizePathAddress = (addr: AddressPath & { scope: Scope }): NormalizedAddressPath => {
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
     * Handles optional scope resolution
     * @internal
     */
    const resolveAddress = async (addr: docAddress): Promise<{ rel: string; abs: string; scope: Scope }> => {
        // Resolve scope (handles optional scope)
        const { scope } = await resolveScopeForAddress(addr);
        const folderService = getFolderService(scope);

        let docPath: string;

        if (addr.kind === 'path') {
            // Path-based addressing: use path directly
            const normalized = normalizePathAddress({ ...addr, scope });
            docPath = normalized.path;
        }
        else {
            // ID-based addressing: lookup in index
            const { id } = addr;

            if (!validateId(id)) {
                fail('INVALID_ID_FORMAT', `ID must match pattern doc\\d{3,} or sdoc\\d{3,}, got '${id}'`, { id });
            }

            const { index } = await readIndex(scope);

            if (!index[id]) {
                fail('doc_NOT_FOUND', `No doc with ID '${id}' in scope '${scope}'`, { id, scope });
            }

            docPath = index[id];
        }

        // Resolve using folder service (no extension, no root prefix)
        const resolved = await folderService.resolve(docPath);

        return { ...resolved, scope };
    };

    /**
     * Generate next available ID for a scope
     * Uses scope-specific prefixes: doc### for project, sdoc### for shared
     * @internal
     */
    const generateNextId = async (scope: Scope): Promise<docId> => {
        if (scope !== 'project' && scope !== 'shared') {
            fail('INVALID_SCOPE', `Scope must be 'project' or 'shared', got '${scope}'`, { scope });
        }

        const { index } = await readIndex(scope);

        // Determine prefix based on scope
        const prefix = scope === 'project' ? 'doc' : 'sdoc';
        const pattern = new RegExp(`^${prefix}(\\d{3,})$`);

        let maxNum = 0;
        for (const id of Object.keys(index)) {
            const match = id.match(pattern);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) {
                    maxNum = num;
                }
            }
        }

        const nextNum = maxNum + 1;
        const nextId = `${prefix}${nextNum.toString().padStart(3, '0')}` as docId;

        return nextId;
    };

    /**
     * Create new doc
     * Scope defaults to 'project' if not provided
     * @internal
     */
    const createdoc = async (input: CreatedocInput): Promise<CreatedocResult> => {
        const { address, content } = input;

        if (address.kind !== 'path') {
            fail('VALIDATION_ERROR', 'Create requires path-based addressing');
        }

        // Default to project scope if not specified
        const scope = address.scope ?? 'project';
        const normalized = normalizePathAddress({ ...address, scope });
        const { path } = normalized;

        // Prevent creating docs with ID-like paths
        if (docAddressResolver.isdocId(path)) {
            fail('INVALID_PATH_FORMAT', `Cannot create doc with path '${path}' - matches ID pattern`, { path, scope });
        }

        const fileService = getFileService(scope);
        const folderService = getFolderService(scope);

        const id = await generateNextId(scope);

        const exists = await fileService.exists(path);
        if (exists) {
            fail('doc_ALREADY_EXISTS', `doc already exists at path '${path}'`, { path, scope });
        }

        const parentPath = dirname(path);
        if (parentPath !== '.') {
            await folderService.ensureDir(parentPath);
        }

        const { newHash } = await fileService.writeTextAtomicIfUnchanged(
            path,
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
     * Read doc content
     * Handles optional scope resolution
     * @internal
     */
    const readdoc = async (addr: docAddress): Promise<ReaddocResult> => {
        // Resolve address to file path and scope
        const { rel: relativePath, scope } = await resolveAddress(addr);

        // Read file content
        const fileService = getFileService(scope);
        const { content, hash } = await fileService.readText(relativePath);

        // Parse front matter
        const { frontMatter, bodyContent, rawFrontMatter: _rawFrontMatter } = parseFrontMatter(content);

        // Determine canonical path and ID
        let canonicalPath: string;
        let canonicalId: string;

        if (addr.kind === 'path') {
            const normalized = normalizePathAddress({ ...addr, scope });
            canonicalPath = normalized.path;

            // Lookup ID from index
            const { index } = await readIndex(scope);
            const foundId = Object.keys(index).find(id => index[id] === canonicalPath);
            if (!foundId) {
                return fail('doc_NOT_FOUND', `doc exists but not in index: '${canonicalPath}'`, { path: canonicalPath, scope });
            }
            canonicalId = foundId;
        }
        else if (addr.kind === 'id') {
            canonicalId = addr.id;

            // Lookup path from index
            const { index } = await readIndex(scope);
            const foundPath = index[canonicalId];
            if (!foundPath) {
                return fail('doc_NOT_FOUND', `No doc with ID '${canonicalId}'`, { id: canonicalId, scope });
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
            id: canonicalId as docId
        };
    };

    /**
     * Edit latest version using optimistic concurrency
     * Handles optional scope resolution
     * @internal
     */
    const editLatest = async (
        addr: Omit<docAddress, 'version'>,
        baseHash: string,
        edits: EditOp[]
    ): Promise<EditdocResult> => {
        // Resolve address to file path and scope
        const { rel: relativePath, scope } = await resolveAddress(addr as docAddress);

        // Read current content
        const fileService = getFileService(scope);
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
     * Delete doc from working copy
     * Handles optional scope resolution
     * @internal
     */
    const deleteLatest = async (
        addr: Omit<docAddress, 'version'>,
        expectedHash: string
    ): Promise<DeletedocResult> => {
        // Resolve address to file path and scope first
        const { rel: relativePath, scope } = await resolveAddress(addr as docAddress);

        // Resolve doc ID from address
        // Note: TypeScript doesn't properly narrow Omit<discriminated union>, so we use type assertions
        const docId = await (async (): Promise<string> => {
            if (addr.kind === 'id') {
                return (addr as Omit<AddressId, 'version'>).id;
            }
            else if (addr.kind === 'path') {
                const pathAddr = addr as Omit<AddressPath, 'version'>;
                const normalized = normalizePathAddress({ ...pathAddr, scope } as AddressPath & { scope: Scope });
                const { index } = await readIndex(scope);
                const foundId = Object.keys(index).find(id => index[id] === normalized.path);
                if (!foundId) {
                    return fail('doc_NOT_FOUND', `doc not in index: '${normalized.path}'`, { path: normalized.path, scope });
                }
                return foundId;
            }
            else {
                const _exhaustive: never = addr as never;
                return fail('VALIDATION_ERROR', `Unknown address kind: ${JSON.stringify(_exhaustive)}`);
            }
        })();

        const fileService = getFileService(scope);
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
        const { index, hash: indexHash } = await readIndex(scope);
        if (index[docId]) {
            delete index[docId];
            await writeIndex(scope, index, indexHash);
        }

        return { deleted };
    };

    /**
     * List docs with optional scope
     * When scope is omitted, lists from both scopes with override detection
     * @internal
     */
    const listdocs = async (params: ListdocsParams): Promise<docListItem[]> => {
        const { scope, pathPrefix, includeContent = false } = params;

        // If scope provided, list from single scope (legacy behavior)
        if (scope) {
            if (scope !== 'project' && scope !== 'shared') {
                fail('INVALID_SCOPE', `Scope must be 'project' or 'shared', got '${scope}'`, { scope });
            }

            return await listdocsInScope(scope, pathPrefix, includeContent);
        }

        // No scope: list from both scopes with override detection
        const projectItems = await listdocsInScope('project', pathPrefix, includeContent);
        const sharedItems = await listdocsInScope('shared', pathPrefix, includeContent);

        // Build path lookup for override detection
        const projectPaths = new Set(projectItems.map(i => i.path));
        const sharedPaths = new Set(sharedItems.map(i => i.path));

        // Mark project items that override shared ones
        for (const item of projectItems) {
            if (sharedPaths.has(item.path)) {
                item.override = 'overrides';
            }
        }

        // Mark shared items that are overridden by project ones
        for (const item of sharedItems) {
            if (projectPaths.has(item.path)) {
                item.override = 'overridden';
            }
        }

        // Combine and sort by path (name) alphabetically
        const combined = [...projectItems, ...sharedItems];
        combined.sort((a, b) => a.path.localeCompare(b.path));

        return combined;
    };

    /**
     * List docs in a specific scope
     * @internal
     */
    const listdocsInScope = async (
        scope: Scope,
        pathPrefix?: string,
        includeContent = false
    ): Promise<docListItem[]> => {
        const fileService = getFileService(scope);
        let index: IndexData;

        try {
            const result = await readIndex(scope);
            index = result.index;
        }
        catch (error: any) {
            // If index doesn't exist, return empty list
            if (error.code === 'NOT_FOUND' || error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }

        const items: docListItem[] = [];

        for (const [id, path] of Object.entries(index)) {
            if (pathPrefix && !path.startsWith(pathPrefix)) {
                continue;
            }

            try {
                if (includeContent) {
                    const { content, hash } = await fileService.readText(path);
                    const stats = await fileService.stat(path);
                    const { frontMatter } = parseFrontMatter(content);

                    items.push({
                        scope,
                        id: id as docId,
                        path,
                        synopsis: frontMatter?.synopsis as string | undefined,
                        hash,
                        modifiedAt: stats.mtime
                    });
                }
                else {
                    const stats = await fileService.stat(path);

                    items.push({
                        scope,
                        id: id as docId,
                        path,
                        modifiedAt: stats.mtime
                    });
                }
            }
            catch {
                // Skip docs that can't be read
                continue;
            }
        }

        // Sort by path (name) alphabetically
        items.sort((a, b) => a.path.localeCompare(b.path));

        return items;
    };

    return Object.freeze({
        create: createdoc,
        read: readdoc,
        editLatest,
        deleteLatest,
        list: listdocs
    });
};

/**
 * docService module
 *
 * Provides operations for managing knowledge docs:
 * - Create: Generate new docs with auto-assigned IDs
 * - Read: Access docs by path or ID
 * - Edit: Apply text transformations with optimistic locking
 * - Delete: Remove from working copy (preserves history)
 * - List: Enumerate docs with metadata
 *
 * ## Storage Structure
 *
 * docs are stored as files organized by scope (extensions optional):
 * ```
 * project/docs/
 *   .index.json              # Maps IDs to paths: { "doc001": "auth/jwt-setup" }
 *   auth/jwt-setup           # doc content (extension optional)
 *   testing/patterns.md      # Extension allowed but not required
 *
 * shared/docs/
 *   .index.json              # Shared scope index
 *   workflows/tdd            # doc content (extension optional)
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
 * { kind: 'id', scope: 'project', id: 'doc001' }
 * ```
 *
 * ## Concurrency Control
 *
 * Edit and delete operations use hash-based optimistic locking:
 * - Read doc to get current hash
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
 * @module docService
 */
const docService = Object.freeze({
    create
});

export default docService;
export type {
    DocServiceApi,
    docServiceOptions,
    docFrontMatter,
    FrontMatterParseResult,
    docAddress,
    AddressPath,
    AddressId,
    NormalizedAddressPath,
    EditOp,
    CreatedocInput,
    CreatedocResult,
    ReaddocResult,
    EditdocResult,
    DeletedocResult,
    docListItem,
    ListdocsParams,
    PathValidationResult,
    docErrorCode,
    FsError,
    Scope,
    docId,
    docPath
};
