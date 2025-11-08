import type { CoreServices } from '../../core/Core.js';
import type { DocToolApi } from './doc/shared/types.js';
import type { TemplateToolApi } from './template/shared/types.js';

import docCreateTool from './doc/create.js';
import docDeleteTool from './doc/delete.js';
import docEditTool from './doc/edit.js';
import docListTool from './doc/list.js';
import docMoveTool from './doc/move.js';
import docReadTool from './doc/read.js';

import templateCreateTool from './template/create.js';
import templateDeleteTool from './template/delete.js';
import templateEditTool from './template/edit.js';
import templateListTool from './template/list.js';
import templateMoveTool from './template/move.js';
import templateReadTool from './template/read.js';
import templateRenderTool from './template/render.js';
import templateGetParametersTool from './template/get-parameters.js';

/**
 * Registry of all MCP tool factories
 * Each factory takes CoreServices and returns a tool API
 */
export const toolFactories: Array<(services: CoreServices) => DocToolApi | TemplateToolApi> = [
    docCreateTool.create,
    docDeleteTool.create,
    docEditTool.create,
    docListTool.create,
    docMoveTool.create,
    docReadTool.create,
    templateCreateTool.create,
    templateDeleteTool.create,
    templateEditTool.create,
    templateListTool.create,
    templateMoveTool.create,
    templateReadTool.create,
    templateRenderTool.create,
    templateGetParametersTool.create
];
