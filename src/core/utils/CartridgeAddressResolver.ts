import AddressResolver from './AddressResolver.js';
import type { AddressResolverApi } from './AddressResolver.js';

/**
 * Scope where cartridges are stored
 */
type Scope = 'project' | 'shared';

/**
 * Cartridge ID formats
 */
type ProjectCartridgeId = `crt${string}`;
type SharedCartridgeId = `scrt${string}`;
type CartridgeId = ProjectCartridgeId | SharedCartridgeId;

/**
 * Project cartridge resolver (crt### pattern)
 */
const projectResolver: AddressResolverApi = AddressResolver.create({
    idPattern: /^crt\d{3,}$/,
    entityName: 'project-cartridge'
});

/**
 * Shared cartridge resolver (scrt### pattern)
 */
const sharedResolver: AddressResolverApi = AddressResolver.create({
    idPattern: /^scrt\d{3,}$/,
    entityName: 'shared-cartridge'
});

/**
 * Detects scope from cartridge ID prefix
 *
 * @param id - Cartridge ID to check
 * @returns 'project' if crt###, 'shared' if scrt###, undefined if neither
 *
 * @example
 * ```typescript
 * detectScopeFromId('crt001');   // 'project'
 * detectScopeFromId('scrt005');  // 'shared'
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
 * Check if string is a valid cartridge ID (either project or shared)
 *
 * @param identifier - String to check
 * @returns true if matches crt### or scrt### pattern
 */
export const isCartridgeId = (identifier: string): identifier is CartridgeId => {
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
 * CartridgeAddressResolver utility module
 *
 * Provides scope-aware cartridge identifier resolution.
 * Manages two AddressResolver instances (project and shared scopes)
 * with distinct ID patterns (crt### vs scrt###).
 *
 * ## ID Formats
 * - **Project**: `crt001`, `crt002`, ... `crt999`, `crt1000`, ...
 * - **Shared**: `scrt001`, `scrt002`, ... `scrt999`, `scrt1000`, ...
 *
 * ## Usage
 *
 * ```typescript
 * import { detectScopeFromId, isCartridgeId, getResolverForScope } from './CartridgeAddressResolver.js';
 *
 * // Detect scope from ID
 * const scope = detectScopeFromId('crt001');  // 'project'
 *
 * // Check if valid ID
 * if (isCartridgeId(identifier)) {
 *     // Use as CartridgeId type
 * }
 *
 * // Get scope-specific resolver
 * const resolver = getResolverForScope('shared');
 * resolver.isId('scrt001');  // true
 * ```
 *
 * @module CartridgeAddressResolver
 */
export const CartridgeAddressResolver = Object.freeze({
    project: projectResolver,
    shared: sharedResolver,
    detectScopeFromId,
    isCartridgeId,
    getResolverForScope,
    validateIdForScope
});

export default CartridgeAddressResolver;
