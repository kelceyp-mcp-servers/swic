import type { CoreServices } from '../../../../core/Core.js';

/**
 * MCP Tool Definition
 * Describes the tool's name, description, and input schema
 * inputSchema is now a Zod raw shape (Record<string, ZodType>)
 */
export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: Record<string, any>; // Zod schema fields
}

/**
 * MCP Tool Response Content
 */
export interface ToolResponseContent {
    type: 'text';
    text: string;
}

/**
 * MCP Tool Response
 * Standard response format for MCP tools
 */
export interface ToolResponse {
    content: ToolResponseContent[];
}

/**
 * MCP Tool Handler
 * Async function that processes tool invocations
 */
export interface ToolHandler {
    (args: any, services: CoreServices): Promise<ToolResponse>;
}

/**
 * doc Tool API
 * Combines definition and handler for a doc tool
 */
export interface DocToolApi {
    definition: ToolDefinition;
    handler: ToolHandler;
}
