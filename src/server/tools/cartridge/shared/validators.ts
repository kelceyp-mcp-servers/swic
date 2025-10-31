/**
 * Validates that a value is a non-empty string
 * @param value - Value to validate
 * @param name - Parameter name for error messages
 * @throws Error if validation fails
 */
export const validateString = (value: unknown, name: string): void => {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`${name} is required and must be a non-empty string`);
    }
};

/**
 * Validates that a scope value is valid
 * @param scope - Scope value to validate
 * @throws Error if validation fails
 */
export const validateScope = (scope: unknown): void => {
    if (scope !== undefined && scope !== 'project' && scope !== 'shared') {
        throw new Error('scope must be "project" or "shared"');
    }
};

/**
 * Validates that a value is a boolean
 * @param value - Value to validate
 * @param name - Parameter name for error messages
 * @throws Error if validation fails
 */
export const validateBoolean = (value: unknown, name: string): void => {
    if (value !== undefined && typeof value !== 'boolean') {
        throw new Error(`${name} must be a boolean`);
    }
};

/**
 * Parses and normalizes identifier input
 * Handles both single strings and arrays of strings
 * @param input - String or array of strings
 * @returns Array of deduplicated, trimmed identifiers
 * @throws Error if input is invalid or empty
 */
export const parseIdentifiers = (input: unknown): string[] => {
    let identifiers: string[];

    if (typeof input === 'string') {
        identifiers = [input];
    } else if (Array.isArray(input)) {
        if (input.length === 0) {
            throw new Error('identifier array cannot be empty');
        }
        identifiers = input;
    } else {
        throw new Error('identifier must be a string or array of strings');
    }

    // Validate all are strings
    for (const id of identifiers) {
        if (typeof id !== 'string' || id.trim().length === 0) {
            throw new Error('All identifiers must be non-empty strings');
        }
    }

    // Trim and deduplicate
    const trimmed = identifiers.map(id => id.trim());
    const unique = [...new Set(trimmed)];

    if (unique.length === 0) {
        throw new Error('No valid identifiers provided');
    }

    return unique;
};
