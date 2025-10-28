/**
 * Address resolution result
 */
interface ResolvedAddress {
    kind: 'id' | 'path';
    value: string;
}

/**
 * Options for creating an AddressResolver instance
 */
interface AddressResolverOptions {
    idPattern: RegExp;
    entityName: string;
}

/**
 * AddressResolver API
 */
interface AddressResolverApi {
    /** Check if string matches ID pattern */
    isId(identifier: string): boolean;

    /** Validate ID format (alias for isId, for clarity) */
    validateId(id: string): boolean;

    /** Resolve identifier to kind and value */
    resolve(identifier: string): ResolvedAddress;

    /** Get the ID pattern regex */
    getPattern(): RegExp;

    /** Get the entity name */
    getEntityName(): string;
}

/**
 * Creates an AddressResolver instance
 *
 * Provides utilities for resolving and validating entity identifiers.
 * Determines whether a given identifier is an ID (matching a pattern)
 * or a path (anything else).
 *
 * @param options - Configuration including ID pattern and entity name
 * @returns Frozen AddressResolver API
 *
 * @example
 * ```typescript
 * const cartridgeAddress = AddressResolver.create({
 *     idPattern: /^crt\d{3,}$/,
 *     entityName: 'cartridge'
 * });
 *
 * cartridgeAddress.isId('crt001');  // true
 * cartridgeAddress.isId('auth/jwt'); // false
 *
 * const result = cartridgeAddress.resolve('crt001');
 * // { kind: 'id', value: 'crt001' }
 * ```
 */
const create = (options: AddressResolverOptions): AddressResolverApi => {
    const { idPattern, entityName } = options;

    /**
     * Check if identifier matches ID pattern
     */
    const isId = (identifier: string): boolean => {
        return idPattern.test(identifier);
    };

    /**
     * Validate ID format (alias for isId)
     */
    const validateId = (id: string): boolean => {
        return isId(id);
    };

    /**
     * Resolve identifier to kind and value
     *
     * If identifier matches ID pattern, returns kind='id'.
     * Otherwise returns kind='path'.
     */
    const resolve = (identifier: string): ResolvedAddress => {
        if (isId(identifier)) {
            return { kind: 'id', value: identifier };
        }
        return { kind: 'path', value: identifier };
    };

    /**
     * Get the ID pattern regex
     */
    const getPattern = (): RegExp => {
        return idPattern;
    };

    /**
     * Get the entity name
     */
    const getEntityName = (): string => {
        return entityName;
    };

    return Object.freeze({
        isId,
        validateId,
        resolve,
        getPattern,
        getEntityName
    });
};

/**
 * AddressResolver utility module
 *
 * Provides consistent identifier resolution across entity types.
 * Determines whether an identifier is an ID (matches pattern) or path.
 *
 * ## Usage Pattern
 *
 * Create one instance per entity type:
 *
 * ```typescript
 * const cartridgeAddress = AddressResolver.create({
 *     idPattern: /^crt\d{3,}$/,
 *     entityName: 'cartridge'
 * });
 * ```
 *
 * Use for validation, resolution, and preventing ID-like names:
 *
 * ```typescript
 * // Prevent ID-like paths
 * if (cartridgeAddress.isId(name)) {
 *     throw new Error('Cannot use ID format as name');
 * }
 *
 * // Auto-detect identifier type
 * const { kind, value } = cartridgeAddress.resolve(identifier);
 * ```
 *
 * @module AddressResolver
 */
const AddressResolver = Object.freeze({
    create
});

export default AddressResolver;
export type {
    AddressResolverApi,
    AddressResolverOptions,
    ResolvedAddress
};
