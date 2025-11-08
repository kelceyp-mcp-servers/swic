import type { FileServiceApi } from './FileService.js';
import type { FolderServiceApi } from './FolderService.js';
import templateAddressResolver, { detectScopeFromId } from '../utils/TemplateAddressResolver.js';
import { dirname } from 'path';
import Handlebars from 'handlebars';
import yaml from 'yaml';

/**
 * TemplateService — Template management with Handlebars rendering
 *
 * Manages reusable document structures with variable substitution using
 * Handlebars markup. Supports path-based and ID-based addressing with
 * front matter validation and parameter metadata extraction.
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
 * Scope where templates are stored
 * - project: Project-specific templates, local to repository
 * - shared: User-level templates, shared across projects
 */
type Scope = 'project' | 'shared';

/**
 * Template unique identifier formats:
 * - Project templates: tpl{num} (e.g., tpl001, tpl002, tpl123)
 * - Shared templates: stpl{num} (e.g., stpl001, stpl002, stpl123)
 *
 * The prefix disambiguates scope, eliminating ID collisions between scopes.
 */
type ProjectTemplateId = `tpl${string}`;
type SharedTemplateId = `stpl${string}`;
type TemplateId = ProjectTemplateId | SharedTemplateId;

/**
 * POSIX-style path within scope
 * Examples: "prompts/story-init.md", "reviews/code-review"
 */
type TemplatePath = string;

/**
 * Parameter type for template rendering
 */
type ParamType = 'string' | 'number' | 'boolean';

/**
 * Parameter definition from template front matter
 */
interface ParamDefinition {
    type: ParamType;
    required: boolean;
    description?: string;
    default?: string | number | boolean;
}

/**
 * Template type values
 */
type TemplateType =
    | 'prompt'
    | 'doc'
    | 'story-spec'
    | 'story-tech-doc'
    | 'subtask'
    | 'review'
    | 'feedback'
    | 'feedback-review'
    | 'retro';

/**
 * Template front matter fields (enforced YAML)
 */
interface TemplateFrontMatter {
    type: TemplateType;
    params: {
        [paramName: string]: ParamDefinition;
    };
    synopsis?: string;
    [key: string]: unknown;
}

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
    path: TemplatePath;
    version?: string;
}

/**
 * Normalized path address (version stripped)
 * Used internally after validation
 */
interface NormalizedAddressPath {
    scope: Scope;
    path: TemplatePath;
}

/**
 * ID-based addressing (Method 2)
 * Specifies template by unique identifier
 *
 * Scope is optional:
 * - If provided: use specified scope
 * - If omitted: infer from ID prefix (tpl### = project, stpl### = shared)
 */
interface AddressId {
    scope?: Scope;
    id: TemplateId;
    version?: string;
}

/**
 * Discriminated union for addressing templates
 * Supports both path-based and ID-based addressing methods
 */
type TemplateAddress =
    | ({ kind: 'path' } & AddressPath)
    | ({ kind: 'id' } & AddressId);

/**
 * Result of front matter parsing
 */
interface FrontMatterParseResult {
    rawFrontMatter?: string;
    frontMatter?: TemplateFrontMatter;
    bodyContent: string;
    isValid: boolean;
    validationError?: string;
}

/**
 * Text replacement operations for editing templates
 * Atomic operations applied to latest version only
 */
type EditOp =
    | { op: 'replaceOnce'; oldText: string; newText: string }
    | { op: 'replaceAll'; oldText: string; newText: string }
    | { op: 'replaceRegex'; pattern: string; flags?: string; replacement: string }
    | { op: 'replaceAllContent'; content: string };

/**
 * Input for creating a new template
 * Uses Method 1 (path-based) addressing only
 *
 * Scope is optional:
 * - If provided: create in specified scope
 * - If omitted: defaults to 'project' scope
 */
interface CreateTemplateInput {
    address: { kind: 'path' } & Omit<AddressPath, 'version'>;
    content: string;
}

/**
 * Result of creating a template
 */
interface CreateTemplateResult {
    id: TemplateId;
    path: TemplatePath;
}

/**
 * Result of reading a template
 */
interface ReadTemplateResult {
    address: TemplateAddress;
    content: string;
    frontMatter?: TemplateFrontMatter;
    bodyContent: string;
    path: TemplatePath;
    id: TemplateId;
    isValid: boolean;
}

/**
 * Result of editing a template
 */
interface EditTemplateResult {
    applied: number;
}

/**
 * Result of deleting a template
 */
interface DeleteTemplateResult {
    deleted: boolean;
}

/**
 * List item for template listing
 */
interface TemplateListItem {
    scope: Scope;
    id: TemplateId;
    path: TemplatePath;
    synopsis?: string;
    modifiedAt?: Date;
    isValid: boolean;
    /**
     * Override status when same path exists in both scopes:
     * - 'overrides': Project template that shadows a shared template
     * - 'overridden': Shared template that is shadowed by a project template
     * - undefined: No conflict, or single-scope listing
     */
    override?: 'overrides' | 'overridden';
}

/**
 * Parameters for listing templates
 *
 * Scope is optional:
 * - If provided: list only templates in that scope
 * - If omitted: list templates from both scopes with override detection
 */
interface ListTemplatesParams {
    scope?: Scope;
    pathPrefix?: string;
    includeContent?: boolean;
}

/**
 * Path validation result
 */
interface PathValidationResult {
    valid: boolean;
    normalized?: TemplatePath;
    reason?: string;
}

/**
 * Template-specific error codes
 * These extend the base FsError codes from FileService/FolderService
 */
type TemplateErrorCode =
    | 'TEMPLATE_NOT_FOUND'
    | 'TEMPLATE_ALREADY_EXISTS'
    | 'TEMPLATE_INVALID'
    | 'INVALID_ID_FORMAT'
    | 'INVALID_PATH_FORMAT'
    | 'INVALID_SCOPE'
    | 'MISSING_REQUIRED_PARAM'
    | 'INVALID_PARAM_TYPE';

/**
 * Index file structure with bidirectional mappings and metadata
 * @internal
 */
interface IndexData {
    id: {
        [id: string]: {
            path: string;
            isValid: boolean;
            params: {
                [paramName: string]: ParamDefinition;
            };
        };
    };
    pathToId: {
        [path: string]: string;
    };
}

/**
 * TemplateService API
 * Manages template lifecycle operations with last-write-wins semantics
 */
interface TemplateServiceApi {
    /**
     * Create new template
     *
     * Uses Method 1 (path-based) addressing
     * Generates unique ID automatically
     * Validates front matter and extracts metadata
     * Writes content atomically
     *
     * @param input - Template creation input with path and content
     * @returns Generated ID and path
     * @throws {FsError} TEMPLATE_ALREADY_EXISTS if path already occupied
     * @throws {FsError} INVALID_PATH_FORMAT if path format is invalid
     * @throws {FsError} TEMPLATE_INVALID if front matter validation fails
     */
    create(input: CreateTemplateInput): Promise<CreateTemplateResult>;

    /**
     * Read template by address
     *
     * Supports both path-based and ID-based addressing
     * Returns content with parsed front matter
     * Scope is optional with fallback resolution
     *
     * @param address - Template address (path or ID)
     * @returns Template content and metadata
     * @throws {FsError} TEMPLATE_NOT_FOUND if template doesn't exist
     */
    read(address: TemplateAddress): Promise<ReadTemplateResult>;

    /**
     * Read multiple templates
     *
     * Bulk operation with deduplication
     * Parallel reads for performance
     *
     * @param addresses - Array of template addresses
     * @param includeMetadata - Include ID and path headers in output
     * @returns Array of template contents
     */
    readMany(
        addresses: TemplateAddress[],
        includeMetadata?: boolean
    ): Promise<ReadTemplateResult[]>;

    /**
     * Edit template content
     *
     * Applies text replacement operations
     * Last-write-wins semantics
     * Re-validates front matter after edit
     *
     * @param address - Template address
     * @param operations - Array of edit operations to apply
     * @returns Number of operations applied
     * @throws {FsError} TEMPLATE_NOT_FOUND if template doesn't exist
     */
    edit(
        address: TemplateAddress,
        operations: EditOp[]
    ): Promise<EditTemplateResult>;

    /**
     * Delete template
     *
     * Idempotent operation (returns deleted: false if already gone)
     * Removes from working copy only
     * Updates index atomically
     *
     * @param address - Template address
     * @returns Deletion status
     */
    delete(address: TemplateAddress): Promise<DeleteTemplateResult>;

    /**
     * Delete multiple templates
     *
     * Bulk operation with deduplication
     * Continues on partial failures
     *
     * @param addresses - Array of template addresses
     * @returns Array of deletion results
     */
    deleteMany(addresses: TemplateAddress[]): Promise<DeleteTemplateResult[]>;

    /**
     * List templates
     *
     * Optional scope filter
     * Optional path prefix filter
     * Detects overrides when listing both scopes
     *
     * @param params - Listing parameters
     * @returns Array of template list items
     */
    list(params?: ListTemplatesParams): Promise<TemplateListItem[]>;

    /**
     * Move template to new location
     *
     * Supports cross-scope moves
     * Always generates new ID
     * Read-create-delete pattern
     *
     * @param source - Source template address
     * @param destination - Destination path (not ID)
     * @param destinationScope - Optional destination scope (defaults to source scope)
     * @returns Old and new IDs and paths
     * @throws {FsError} TEMPLATE_NOT_FOUND if source doesn't exist
     * @throws {FsError} TEMPLATE_ALREADY_EXISTS if destination exists
     */
    move(
        source: TemplateAddress,
        destination: TemplatePath,
        destinationScope?: Scope
    ): Promise<{
        oldId: TemplateId;
        newId: TemplateId;
        oldPath: TemplatePath;
        newPath: TemplatePath;
        sourceScope: Scope;
        destinationScope: Scope;
    }>;

    /**
     * Render template with parameters
     *
     * Validates required parameters
     * Applies defaults for optional parameters
     * Type coercion for string/number/boolean
     * Uses Handlebars for rendering
     *
     * @param address - Template address
     * @param params - Parameter values
     * @returns Rendered content (without front matter)
     * @throws {FsError} TEMPLATE_NOT_FOUND if template doesn't exist
     * @throws {FsError} TEMPLATE_INVALID if template has invalid front matter
     * @throws {FsError} MISSING_REQUIRED_PARAM if required parameter missing
     * @throws {FsError} INVALID_PARAM_TYPE if parameter type coercion fails
     */
    render(
        address: TemplateAddress,
        params: Record<string, string | number | boolean>
    ): Promise<string>;

    /**
     * Get parameter definitions for template
     *
     * Extracts parameter metadata from front matter
     * Used for validation and UI generation
     *
     * @param address - Template address
     * @returns Parameter definitions
     * @throws {FsError} TEMPLATE_NOT_FOUND if template doesn't exist
     * @throws {FsError} TEMPLATE_INVALID if template has invalid front matter
     */
    getParameters(
        address: TemplateAddress
    ): Promise<{ [paramName: string]: ParamDefinition }>;
}

/**
 * Configuration for TemplateService
 */
interface TemplateServiceConfig {
    projectFileService: FileServiceApi;
    projectFolderService: FolderServiceApi;
    sharedFileService: FileServiceApi;
    sharedFolderService: FolderServiceApi;
}

const INDEX_FILENAME = '.index.json';
const FRONT_MATTER_DELIMITER = '---';

/**
 * Create TemplateService instance
 *
 * Factory function following project pattern.
 * Returns frozen API object.
 *
 * @param config - Service dependencies
 * @returns TemplateService API
 */
export const createTemplateService = (
    config: TemplateServiceConfig
): TemplateServiceApi => {
    const {
        projectFileService,
        projectFolderService,
        sharedFileService,
        sharedFolderService
    } = config;

    /**
     * Get file service for scope
     * @internal
     */
    const getFileService = (scope: Scope): FileServiceApi => {
        return scope === 'project' ? projectFileService : sharedFileService;
    };

    /**
     * Get folder service for scope
     * @internal
     */
    const getFolderService = (scope: Scope): FolderServiceApi => {
        return scope === 'project' ? projectFolderService : sharedFolderService;
    };

    /**
     * Get index file path for scope
     * @internal
     */
    const getIndexPath = (_scope: Scope): string => {
        return INDEX_FILENAME;
    };

    /**
     * Create error with code
     * @internal
     */
    const fail = (code: TemplateErrorCode, message: string, data?: unknown): never => {
        const error = new Error(message) as FsError;
        error.code = code;
        if (data !== undefined) {
            error.data = data;
        }
        throw error;
    };

    /**
     * Validate path format
     * @internal
     */
    const validatePath = (path: string): PathValidationResult => {
        if (!path || path.trim().length === 0) {
            return { valid: false, reason: 'Path cannot be empty' };
        }

        if (path.startsWith('/')) {
            return { valid: false, reason: 'Path cannot start with /' };
        }

        if (path.includes('..')) {
            return { valid: false, reason: 'Path cannot contain ..' };
        }

        // eslint-disable-next-line no-control-regex
        const invalidChars = /[<>:"|?*\x00]/;
        if (invalidChars.test(path)) {
            return { valid: false, reason: 'Path contains invalid characters' };
        }

        const normalized = path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

        return { valid: true, normalized };
    };

    /**
     * Read index file
     * Returns empty index if file doesn't exist
     * @internal
     */
    const readIndex = async (scope: Scope): Promise<IndexData> => {
        const indexPath = getIndexPath(scope);
        const fileService = getFileService(scope);

        try {
            const content = await fileService.readText(indexPath);
            const parsed = JSON.parse(content);
            return parsed as IndexData;
        }
        catch (error: any) {
            // If index doesn't exist, return empty index
            if (error.code === 'NOT_FOUND') {
                return { id: {}, pathToId: {} };
            }
            throw error;
        }
    };

    /**
     * Write index file
     * Uses last-write-wins semantics
     * @internal
     */
    const writeIndex = async (
        scope: Scope,
        index: IndexData
    ): Promise<void> => {
        const indexPath = getIndexPath(scope);
        const fileService = getFileService(scope);
        const content = JSON.stringify(index, null, 2);
        await fileService.writeText(indexPath, content);
    };

    /**
     * Parse and validate front matter from template content
     * Enforces type and params fields with proper structure
     * @internal
     */
    const parseFrontMatter = (content: string): FrontMatterParseResult => {
        const lines = content.split('\n');

        if (lines.length < 3 || lines[0].trim() !== FRONT_MATTER_DELIMITER) {
            return {
                bodyContent: content,
                isValid: false,
                validationError: 'Missing front matter delimiter'
            };
        }

        let endIndex = -1;
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === FRONT_MATTER_DELIMITER) {
                endIndex = i;
                break;
            }
        }

        if (endIndex === -1) {
            return {
                bodyContent: content,
                isValid: false,
                validationError: 'Missing closing front matter delimiter'
            };
        }

        const fmText = lines.slice(1, endIndex).join('\n');
        const rawFrontMatter = lines.slice(0, endIndex + 1).join('\n');
        const bodyContent = lines.slice(endIndex + 1).join('\n').trim();

        let frontMatter: any;
        try {
            frontMatter = yaml.parse(fmText);
        }
        catch (error: any) {
            return {
                bodyContent: content,
                isValid: false,
                validationError: `YAML parse error: ${error.message}`
            };
        }

        // Validate type field
        if (!frontMatter.type) {
            return {
                rawFrontMatter,
                bodyContent,
                isValid: false,
                validationError: 'Missing required field: type'
            };
        }

        const validTypes: TemplateType[] = [
            'prompt',
            'doc',
            'story-spec',
            'story-tech-doc',
            'subtask',
            'review',
            'feedback',
            'feedback-review',
            'retro'
        ];

        if (!validTypes.includes(frontMatter.type)) {
            return {
                rawFrontMatter,
                bodyContent,
                isValid: false,
                validationError: `Invalid type: ${frontMatter.type}. Must be one of: ${validTypes.join(', ')}`
            };
        }

        // Validate params field
        if (!frontMatter.params) {
            return {
                rawFrontMatter,
                bodyContent,
                isValid: false,
                validationError: 'Missing required field: params'
            };
        }

        if (typeof frontMatter.params !== 'object' || Array.isArray(frontMatter.params)) {
            return {
                rawFrontMatter,
                bodyContent,
                isValid: false,
                validationError: 'params must be an object'
            };
        }

        // Validate each parameter definition
        const validParamTypes: ParamType[] = ['string', 'number', 'boolean'];
        const params: { [name: string]: ParamDefinition } = {};

        for (const [paramName, paramDef] of Object.entries(frontMatter.params)) {
            if (typeof paramDef !== 'object' || Array.isArray(paramDef)) {
                return {
                    rawFrontMatter,
                    bodyContent,
                    isValid: false,
                    validationError: `Parameter ${paramName} definition must be an object`
                };
            }

            const def = paramDef as any;

            if (!def.type) {
                return {
                    rawFrontMatter,
                    bodyContent,
                    isValid: false,
                    validationError: `Parameter ${paramName} missing type field`
                };
            }

            if (!validParamTypes.includes(def.type)) {
                return {
                    rawFrontMatter,
                    bodyContent,
                    isValid: false,
                    validationError: `Parameter ${paramName} has invalid type: ${def.type}. Must be one of: ${validParamTypes.join(', ')}`
                };
            }

            if (def.required !== undefined && typeof def.required !== 'boolean') {
                return {
                    rawFrontMatter,
                    bodyContent,
                    isValid: false,
                    validationError: `Parameter ${paramName} required field must be boolean`
                };
            }

            params[paramName] = {
                type: def.type,
                required: def.required ?? false,
                description: def.description,
                default: def.default
            };
        }

        return {
            rawFrontMatter,
            frontMatter: {
                type: frontMatter.type,
                params,
                synopsis: frontMatter.synopsis,
                ...frontMatter
            },
            bodyContent,
            isValid: true
        };
    };

    /**
     * Apply edit operations to content
     * @internal
     */
    const applyEdits = (content: string, operations: EditOp[]): { content: string; applied: number } => {
        let result = content;
        let applied = 0;

        for (const op of operations) {
            const before = result;

            switch (op.op) {
            case 'replaceOnce':
                result = result.replace(op.oldText, op.newText);
                break;

            case 'replaceAll': {
                const escaped = op.oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                result = result.replace(new RegExp(escaped, 'g'), op.newText);
                break;
            }

            case 'replaceRegex': {
                const regex = new RegExp(op.pattern, op.flags || '');
                result = result.replace(regex, op.replacement);
                break;
            }

            case 'replaceAllContent':
                result = op.content;
                break;
            }

            if (result !== before || op.op === 'replaceAllContent') {
                applied++;
            }
        }

        return { content: result, applied };
    };

    /**
     * Resolve address to normalized form
     * Handles scope detection and validation
     * @internal
     */
    const resolveAddress = async (
        address: TemplateAddress
    ): Promise<NormalizedAddressPath & { id: TemplateId }> => {
        if (address.kind === 'id') {
            // ID-based addressing
            let scope = address.scope;

            if (!scope) {
                // Detect scope from ID prefix
                const detected = detectScopeFromId(address.id);
                if (!detected) {
                    fail('INVALID_ID_FORMAT', `Invalid template ID format: ${address.id}`);
                }
                scope = detected;
            }

            // Validate ID format for scope
            if (!templateAddressResolver.validateIdForScope(address.id, scope)) {
                fail('INVALID_ID_FORMAT', `Invalid template ID format for ${scope} scope: ${address.id}`);
            }

            // Look up path in index
            const index = await readIndex(scope);
            const entry = index.id[address.id];

            if (!entry) {
                fail('TEMPLATE_NOT_FOUND', `Template not found: ${address.id}`);
            }

            return {
                scope,
                path: entry.path,
                id: address.id
            };
        }
        else {
            // Path-based addressing
            const validation = validatePath(address.path);
            if (!validation.valid) {
                fail('INVALID_PATH_FORMAT', validation.reason || 'Invalid path format');
            }

            const path = validation.normalized!;

            if (address.scope) {
                // Explicit scope provided
                const index = await readIndex(address.scope);
                const id = index.pathToId[path];

                if (!id) {
                    fail('TEMPLATE_NOT_FOUND', `Template not found: ${path} in ${address.scope} scope`);
                }

                return {
                    scope: address.scope,
                    path,
                    id: id as TemplateId
                };
            }
            else {
                // Try project first, then shared
                const projectIndex = await readIndex('project');
                const projectId = projectIndex.pathToId[path];

                if (projectId) {
                    return {
                        scope: 'project',
                        path,
                        id: projectId as TemplateId
                    };
                }

                const sharedIndex = await readIndex('shared');
                const sharedId = sharedIndex.pathToId[path];

                if (sharedId) {
                    return {
                        scope: 'shared',
                        path,
                        id: sharedId as TemplateId
                    };
                }

                fail('TEMPLATE_NOT_FOUND', `Template not found: ${path}`);
            }
        }
    };

    /**
     * Generate next ID for scope
     * @internal
     */
    const generateNextId = async (scope: Scope): Promise<TemplateId> => {
        const index = await readIndex(scope);
        const prefix = scope === 'project' ? 'tpl' : 'stpl';
        const pattern = new RegExp(`^${prefix}(\\d{3,})$`);

        let maxNum = 0;
        for (const id of Object.keys(index.id)) {
            const match = id.match(pattern);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) {
                    maxNum = num;
                }
            }
        }

        const nextNum = maxNum + 1;
        return `${prefix}${nextNum.toString().padStart(3, '0')}` as TemplateId;
    };

    /**
     * Coerce parameter value to expected type
     * @internal
     */
    const coerceParam = (
        value: string | number | boolean,
        type: ParamType,
        paramName: string
    ): string | number | boolean => {
        if (type === 'string') {
            return String(value);
        }

        if (type === 'number') {
            if (typeof value === 'number') {
                return value;
            }
            const num = parseFloat(String(value));
            if (isNaN(num)) {
                fail('INVALID_PARAM_TYPE', `Parameter ${paramName} must be a valid number, got: ${value}`);
            }
            return num;
        }

        if (type === 'boolean') {
            if (typeof value === 'boolean') {
                return value;
            }
            const str = String(value).toLowerCase();
            if (str === 'true' || str === '1') {
                return true;
            }
            if (str === 'false' || str === '0') {
                return false;
            }
            fail('INVALID_PARAM_TYPE', `Parameter ${paramName} must be a boolean (true/false/1/0), got: ${value}`);
        }

        return value;
    };

    // ========================================
    // Public API Implementation
    // ========================================

    const create = async (input: CreateTemplateInput): Promise<CreateTemplateResult> => {
        const scope = input.address.scope || 'project';
        const validation = validatePath(input.address.path);

        if (!validation.valid) {
            fail('INVALID_PATH_FORMAT', validation.reason || 'Invalid path format');
        }

        const path = validation.normalized!;

        // Prevent creating templates with ID-like paths
        if (templateAddressResolver.isTemplateId(path)) {
            fail('INVALID_PATH_FORMAT', 'Cannot create template with ID pattern as path');
        }

        // Check if path already exists
        const index = await readIndex(scope);
        if (index.pathToId[path]) {
            fail('TEMPLATE_ALREADY_EXISTS', `Template already exists at path: ${path}`);
        }

        // Parse and validate front matter
        const parseResult = parseFrontMatter(input.content);
        if (!parseResult.isValid) {
            fail('TEMPLATE_INVALID', parseResult.validationError || 'Invalid front matter');
        }

        // Generate new ID
        const id = await generateNextId(scope);

        // Write content
        const fileService = getFileService(scope);
        const folderService = getFolderService(scope);
        const dir = dirname(path);
        if (dir && dir !== '.') {
            await folderService.ensureDir(dir);
        }
        await fileService.writeText(path, input.content);

        // Update index
        index.id[id] = {
            path,
            isValid: true,
            params: parseResult.frontMatter!.params
        };
        index.pathToId[path] = id;
        await writeIndex(scope, index);

        return { id, path };
    };

    const read = async (address: TemplateAddress): Promise<ReadTemplateResult> => {
        const resolved = await resolveAddress(address);
        const fileService = getFileService(resolved.scope);
        const content = await fileService.readText(resolved.path);
        const parseResult = parseFrontMatter(content);

        return {
            address,
            content,
            frontMatter: parseResult.frontMatter,
            bodyContent: parseResult.bodyContent,
            path: resolved.path,
            id: resolved.id,
            isValid: parseResult.isValid
        };
    };

    const readMany = async (
        addresses: TemplateAddress[],
        _includeMetadata?: boolean
    ): Promise<ReadTemplateResult[]> => {
        // Deduplicate by serializing addresses
        const unique = Array.from(
            new Map(addresses.map(addr => [JSON.stringify(addr), addr])).values()
        );

        // Read in parallel
        return Promise.all(unique.map(addr => read(addr)));
    };

    const edit = async (
        address: TemplateAddress,
        operations: EditOp[]
    ): Promise<EditTemplateResult> => {
        const resolved = await resolveAddress(address);
        const fileService = getFileService(resolved.scope);
        const content = await fileService.readText(resolved.path);

        // Apply edits
        const { content: newContent, applied } = applyEdits(content, operations);

        // Re-validate front matter
        const parseResult = parseFrontMatter(newContent);

        // Write updated content
        await fileService.writeText(resolved.path, newContent);

        // Update index metadata
        const index = await readIndex(resolved.scope);
        if (index.id[resolved.id]) {
            index.id[resolved.id].isValid = parseResult.isValid;
            if (parseResult.isValid && parseResult.frontMatter) {
                index.id[resolved.id].params = parseResult.frontMatter.params;
            }
            await writeIndex(resolved.scope, index);
        }

        return { applied };
    };

    const deleteTemplate = async (address: TemplateAddress): Promise<DeleteTemplateResult> => {
        try {
            const resolved = await resolveAddress(address);
            const fileService = getFileService(resolved.scope);

            // Try to delete file
            try {
                await fileService.delete(resolved.path);
            }
            catch (error: any) {
                if (error.code === 'NOT_FOUND') {
                    // File already gone, update index and return
                    const index = await readIndex(resolved.scope);
                    delete index.id[resolved.id];
                    delete index.pathToId[resolved.path];
                    await writeIndex(resolved.scope, index);
                    return { deleted: false };
                }
                throw error;
            }

            // Update index
            const index = await readIndex(resolved.scope);
            delete index.id[resolved.id];
            delete index.pathToId[resolved.path];
            await writeIndex(resolved.scope, index);

            return { deleted: true };
        }
        catch (error: any) {
            if (error.code === 'TEMPLATE_NOT_FOUND') {
                return { deleted: false };
            }
            throw error;
        }
    };

    const deleteMany = async (addresses: TemplateAddress[]): Promise<DeleteTemplateResult[]> => {
        // Deduplicate
        const unique = Array.from(
            new Map(addresses.map(addr => [JSON.stringify(addr), addr])).values()
        );

        // Delete sequentially (not parallel to avoid index conflicts)
        const results: DeleteTemplateResult[] = [];
        for (const addr of unique) {
            results.push(await deleteTemplate(addr));
        }
        return results;
    };

    const list = async (params?: ListTemplatesParams): Promise<TemplateListItem[]> => {
        const { scope, pathPrefix, includeContent } = params || {};

        if (scope) {
            // Single scope listing
            const index = await readIndex(scope);
            const items: TemplateListItem[] = [];

            for (const [id, entry] of Object.entries(index.id)) {
                if (pathPrefix && !entry.path.startsWith(pathPrefix)) {
                    continue;
                }

                let synopsis: string | undefined;
                if (includeContent) {
                    try {
                        const fileService = getFileService(scope);
                        const content = await fileService.readText(entry.path);
                        const parseResult = parseFrontMatter(content);
                        synopsis = parseResult.frontMatter?.synopsis;
                    }
                    catch {
                        // Ignore read errors
                    }
                }

                items.push({
                    scope,
                    id: id as TemplateId,
                    path: entry.path,
                    synopsis,
                    isValid: entry.isValid
                });
            }

            return items.sort((a, b) => a.path.localeCompare(b.path));
        }
        else {
            // Both scopes with override detection
            const projectIndex = await readIndex('project');
            const sharedIndex = await readIndex('shared');
            const items: TemplateListItem[] = [];
            const pathToScopes = new Map<string, Set<Scope>>();

            // Collect all paths and their scopes
            for (const entry of Object.values(projectIndex.id)) {
                if (!pathToScopes.has(entry.path)) {
                    pathToScopes.set(entry.path, new Set());
                }
                pathToScopes.get(entry.path)!.add('project');
            }
            for (const entry of Object.values(sharedIndex.id)) {
                if (!pathToScopes.has(entry.path)) {
                    pathToScopes.set(entry.path, new Set());
                }
                pathToScopes.get(entry.path)!.add('shared');
            }

            // Process project templates
            for (const [id, entry] of Object.entries(projectIndex.id)) {
                if (pathPrefix && !entry.path.startsWith(pathPrefix)) {
                    continue;
                }

                let synopsis: string | undefined;
                if (includeContent) {
                    try {
                        const content = await projectFileService.readText(entry.path);
                        const parseResult = parseFrontMatter(content);
                        synopsis = parseResult.frontMatter?.synopsis;
                    }
                    catch {
                        // Ignore
                    }
                }

                const scopes = pathToScopes.get(entry.path);
                const override = scopes && scopes.size > 1 ? 'overrides' as const : undefined;

                items.push({
                    scope: 'project',
                    id: id as TemplateId,
                    path: entry.path,
                    synopsis,
                    isValid: entry.isValid,
                    override
                });
            }

            // Process shared templates
            for (const [id, entry] of Object.entries(sharedIndex.id)) {
                if (pathPrefix && !entry.path.startsWith(pathPrefix)) {
                    continue;
                }

                let synopsis: string | undefined;
                if (includeContent) {
                    try {
                        const content = await sharedFileService.readText(entry.path);
                        const parseResult = parseFrontMatter(content);
                        synopsis = parseResult.frontMatter?.synopsis;
                    }
                    catch {
                        // Ignore
                    }
                }

                const scopes = pathToScopes.get(entry.path);
                const override = scopes && scopes.size > 1 ? 'overridden' as const : undefined;

                items.push({
                    scope: 'shared',
                    id: id as TemplateId,
                    path: entry.path,
                    synopsis,
                    isValid: entry.isValid,
                    override
                });
            }

            return items.sort((a, b) => a.path.localeCompare(b.path));
        }
    };

    const move = async (
        source: TemplateAddress,
        destination: TemplatePath,
        destinationScope?: Scope
    ): Promise<{
        oldId: TemplateId;
        newId: TemplateId;
        oldPath: TemplatePath;
        newPath: TemplatePath;
        sourceScope: Scope;
        destinationScope: Scope;
    }> => {
        // Resolve source
        const resolved = await resolveAddress(source);
        const destScope = destinationScope || resolved.scope;

        // Validate destination path
        const validation = validatePath(destination);
        if (!validation.valid) {
            fail('INVALID_PATH_FORMAT', validation.reason || 'Invalid destination path');
        }
        const destPath = validation.normalized!;

        // Check source and destination aren't the same
        if (resolved.scope === destScope && resolved.path === destPath) {
            fail('TEMPLATE_ALREADY_EXISTS', 'Source and destination are identical');
        }

        // Check destination doesn't exist
        const destIndex = await readIndex(destScope);
        if (destIndex.pathToId[destPath]) {
            fail('TEMPLATE_ALREADY_EXISTS', `Destination already exists: ${destPath}`);
        }

        // Read source content
        const sourceFileService = getFileService(resolved.scope);
        const content = await sourceFileService.readText(resolved.path);

        // Create at destination (generates new ID)
        const createResult = await create({
            address: { kind: 'path', scope: destScope, path: destPath },
            content
        });

        // Delete source
        await deleteTemplate(source);

        return {
            oldId: resolved.id,
            newId: createResult.id,
            oldPath: resolved.path,
            newPath: destPath,
            sourceScope: resolved.scope,
            destinationScope: destScope
        };
    };

    const render = async (
        address: TemplateAddress,
        params: Record<string, string | number | boolean>
    ): Promise<string> => {
        const resolved = await resolveAddress(address);
        const index = await readIndex(resolved.scope);
        const entry = index.id[resolved.id];

        if (!entry.isValid) {
            fail('TEMPLATE_INVALID', `Template has invalid front matter: ${resolved.id}`);
        }

        const fileService = getFileService(resolved.scope);
        const content = await fileService.readText(resolved.path);
        const parseResult = parseFrontMatter(content);

        if (!parseResult.isValid || !parseResult.frontMatter) {
            fail('TEMPLATE_INVALID', `Template has invalid front matter: ${resolved.id}`);
        }

        const paramDefs = parseResult.frontMatter.params;

        // Build context with validation and coercion
        const context: Record<string, string | number | boolean> = {};

        for (const [paramName, paramDef] of Object.entries(paramDefs)) {
            if (paramDef.required && !(paramName in params)) {
                fail('MISSING_REQUIRED_PARAM', `Missing required parameter: ${paramName} for template ${resolved.id}`);
            }

            let value: string | number | boolean;
            if (paramName in params) {
                value = coerceParam(params[paramName], paramDef.type, paramName);
            }
            else if (paramDef.default !== undefined) {
                value = paramDef.default;
            }
            else {
                continue;
            }

            context[paramName] = value;
        }

        // Configure Handlebars with strict mode
        const handlebars = Handlebars.create();
        handlebars.registerHelper('helperMissing', function() {
            throw new Error('Custom helpers are not supported');
        });

        // Compile and render
        const template = handlebars.compile(parseResult.bodyContent, {
            strict: true,
            noEscape: false,
            preventIndent: false
        });

        return template(context);
    };

    const getParameters = async (
        address: TemplateAddress
    ): Promise<{ [paramName: string]: ParamDefinition }> => {
        const resolved = await resolveAddress(address);
        const index = await readIndex(resolved.scope);
        const entry = index.id[resolved.id];

        if (!entry.isValid) {
            fail('TEMPLATE_INVALID', `Template has invalid front matter: ${resolved.id}`);
        }

        return entry.params;
    };

    // Return frozen API
    return Object.freeze({
        create,
        read,
        readMany,
        edit,
        delete: deleteTemplate,
        deleteMany,
        list,
        move,
        render,
        getParameters
    });
};

export type { TemplateServiceApi, TemplateServiceConfig, TemplateAddress, TemplateId, TemplatePath };
