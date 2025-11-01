import AddressResolver from './AddressResolver.js';
import type { AddressResolverApi } from './AddressResolver.js';

/**
 * Scope where docs are stored
 */
type Scope = 'project' | 'shared';

/**
 * doc ID formats
 */
type ProjectdocId = `doc${string}`;
type ShareddocId = `sdoc${string}`;
type docId = ProjectdocId | ShareddocId;

/**
 * Project doc resolver (doc### pattern)
 */
const projectResolver: AddressResolverApi = AddressResolver.create({
    idPattern: /^doc\d{3,}$/,
    entityName: 'project-doc'
});

/**
 * Shared doc resolver (sdoc### pattern)
 */
const sharedResolver: AddressResolverApi = AddressResolver.create({
    idPattern: /^sdoc\d{3,}$/,
    entityName: 'shared-doc'
});

/**
 * Detects scope from doc ID prefix
 *
 * @param id - doc ID to check
 * @returns 'project' if doc###, 'shared' if sdoc###, undefined if neither
 *
 * @example
 * ```typescript
 * detectScopeFromId('doc001');   // 'project'
 * detectScopeFromId('sdoc005');  // 'shared'
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
 * Check if string is a valid doc ID (either project or shared)
 *
 * @param identifier - String to check
 * @returns true if matches doc### or sdoc### pattern
 */
export const isdocId = (identifier: string): identifier is docId => {
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
 * docAddressResolver utility module
 *
 * Provides scope-aware doc identifier resolution.
 * Manages two AddressResolver instances (project and shared scopes)
 * with distinct ID patterns (doc### vs sdoc###).
 *
 * ## ID Formats
 * - **Project**: `doc001`, `doc002`, ... `doc999`, `doc1000`, ...
 * - **Shared**: `sdoc001`, `sdoc002`, ... `sdoc999`, `sdoc1000`, ...
 *
 * ## Usage
 *
 * ```typescript
 * import { detectScopeFromId, isdocId, getResolverForScope } from './docAddressResolver.js';
 *
 * // Detect scope from ID
 * const scope = detectScopeFromId('doc001');  // 'project'
 *
 * // Check if valid ID
 * if (isdocId(identifier)) {
 *     // Use as docId type
 * }
 *
 * // Get scope-specific resolver
 * const resolver = getResolverForScope('shared');
 * resolver.isId('sdoc001');  // true
 * ```
 *
 * @module docAddressResolver
 */
export const docAddressResolver = Object.freeze({
    project: projectResolver,
    shared: sharedResolver,
    detectScopeFromId,
    isdocId,
    getResolverForScope,
    validateIdForScope
});

export default docAddressResolver;
