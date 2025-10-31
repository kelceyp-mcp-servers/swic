import type { CoreServices } from '../../core/Core.js';
import type { CartridgeToolApi } from './cartridge/shared/types.js';

import CartridgeCreateTool from './cartridge/create.js';
import CartridgeDeleteTool from './cartridge/delete.js';
import CartridgeEditTool from './cartridge/edit.js';
import CartridgeListTool from './cartridge/list.js';
import CartridgeMoveTool from './cartridge/move.js';
import CartridgeReadTool from './cartridge/read.js';

/**
 * Registry of all MCP tool factories
 * Each factory takes CoreServices and returns a CartridgeToolApi
 */
export const toolFactories: Array<(services: CoreServices) => CartridgeToolApi> = [
    CartridgeCreateTool.create,
    CartridgeDeleteTool.create,
    CartridgeEditTool.create,
    CartridgeListTool.create,
    CartridgeMoveTool.create,
    CartridgeReadTool.create,
];
