import AddressResolver from './AddressResolver.js';
import type { AddressResolverApi } from './AddressResolver.js';

/**
 * Scope where templates are stored
 */
type Scope = 'project' | 'shared';

/**
 * Template ID formats
 */
type ProjectTemplateId = `tpl${string}`;
type SharedTemplateId = `stpl${string}`;
type TemplateId = ProjectTemplateId | SharedTemplateId;

/**
 * Project template resolver (tpl### pattern)
 */
const projectResolver: AddressResolverApi = AddressResolver.create({
    idPattern: /^tpl\d{3,}$/,
    entityName: 'project-template'
});

/**
 * Shared template resolver (stpl### pattern)
 */
const sharedResolver: AddressResolverApi = AddressResolver.create({
    idPattern: /^stpl\d{3,}$/,
    entityName: 'shared-template'
});

/**
 * Detects scope from template ID prefix
 *
 * @param id - Template ID to check
 * @returns 'project' if tpl###, 'shared' if stpl###, undefined if neither
 *
 * @example
 * ```typescript
 * detectScopeFromId('tpl001');   // 'project'
 * detectScopeFromId('stpl005');  // 'shared'
 * detectScopeFromId('invalid');  // undefined
 * ```
 */
export const detectScopeFromId = (id: string): Scope | undefined => {
    if (projectResolver.isId(id)) {
        return 'project';
    }
    if (sharedResolver.isId(id)) {
        return 'shared';
    }
    return undefined;
};

/**
 * Check if string is a valid template ID (either project or shared)
 *
 * @param identifier - String to check
 * @returns true if matches tpl### or stpl### pattern
 */
export const isTemplateId = (identifier: string): identifier is TemplateId => {
    return projectResolver.isId(identifier) || sharedResolver.isId(identifier);
};

/**
 * Get resolver for specific scope
 *
 * @param scope - Scope to get resolver for
 * @returns AddressResolver instance for that scope
 */
export const getResolverForScope = (scope: Scope): AddressResolverApi => {
    return scope === 'project' ? projectResolver : sharedResolver;
};

/**
 * Validate ID format for specific scope
 *
 * @param id - ID to validate
 * @param scope - Expected scope
 * @returns true if ID matches scope's pattern
 */
export const validateIdForScope = (id: string, scope: Scope): boolean => {
    return getResolverForScope(scope).validateId(id);
};

/**
 * TemplateAddressResolver utility module
 *
 * Provides scope-aware template identifier resolution.
 * Manages two AddressResolver instances (project and shared scopes)
 * with distinct ID patterns (tpl### vs stpl###).
 *
 * ## ID Formats
 * - **Project**: `tpl001`, `tpl002`, ... `tpl999`, `tpl1000`, ...
 * - **Shared**: `stpl001`, `stpl002`, ... `stpl999`, `stpl1000`, ...
 *
 * ## Usage
 *
 * ```typescript
 * import { detectScopeFromId, isTemplateId, getResolverForScope } from './TemplateAddressResolver.js';
 *
 * // Detect scope from ID
 * const scope = detectScopeFromId('tpl001');  // 'project'
 *
 * // Check if valid ID
 * if (isTemplateId(identifier)) {
 *     // Use as TemplateId type
 * }
 *
 * // Get scope-specific resolver
 * const resolver = getResolverForScope('shared');
 * resolver.isId('stpl001');  // true
 * ```
 *
 * @module TemplateAddressResolver
 */
export const templateAddressResolver = Object.freeze({
    project: projectResolver,
    shared: sharedResolver,
    detectScopeFromId,
    isTemplateId,
    getResolverForScope,
    validateIdForScope
});

export default templateAddressResolver;
