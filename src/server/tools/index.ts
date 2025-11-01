import type { CoreServices } from '../../core/Core.js';
import type { DocToolApi } from './doc/shared/types.js';

import docCreateTool from './doc/create.js';
import docDeleteTool from './doc/delete.js';
import docEditTool from './doc/edit.js';
import docListTool from './doc/list.js';
import docMoveTool from './doc/move.js';
import docReadTool from './doc/read.js';

/**
 * Registry of all MCP tool factories
 * Each factory takes CoreServices and returns a docToolApi
 */
export const toolFactories: Array<(services: CoreServices) => DocToolApi> = [
    docCreateTool.create,
    docDeleteTool.create,
    docEditTool.create,
    docListTool.create,
    docMoveTool.create,
    docReadTool.create
];
