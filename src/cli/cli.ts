#!/usr/bin/env bun
import { create, createCommandGroup } from '@kelceyp/clibuilder';
import Core from '../core/Core.js';
import Createdoc from './commands/doc/create.js';
import Deletedoc from './commands/doc/delete.js';
import Editdoc from './commands/doc/edit.js';
import Listdoc from './commands/doc/list.js';
import Movedoc from './commands/doc/move.js';
import Readdoc from './commands/doc/read.js';
import CreateTemplate from './commands/template/create.js';
import DeleteTemplate from './commands/template/delete.js';
import EditTemplate from './commands/template/edit.js';
import ListTemplate from './commands/template/list.js';
import MoveTemplate from './commands/template/move.js';
import ReadTemplate from './commands/template/read.js';
import RenderTemplate from './commands/template/render.js';
import GetParametersTemplate from './commands/template/get-parameters.js';

try {
    const { projectDataDir, sharedDataDir } = Core.lazilyGetDataDirs();

    const services = Core.createServices({
        projectBoundaryDir: projectDataDir,
        sharedBoundaryDir: sharedDataDir
    });

    const app = create()
        .name('swic')
        .version('0.1.0')
        .description('SWIC - Stories Workflows Injected Context')
        .group(
            createCommandGroup('doc')
                .summary('doc operations')
                .command(Createdoc.create(services))
                .command(Deletedoc.create(services))
                .command(Editdoc.create(services))
                .command(Listdoc.create(services))
                .command(Movedoc.create(services))
                .command(Readdoc.create(services))
                .build()
        )
        .group(
            createCommandGroup('template')
                .summary('Template operations')
                .command(CreateTemplate.create(services))
                .command(DeleteTemplate.delete(services))
                .command(EditTemplate.edit(services))
                .command(ListTemplate.list(services))
                .command(MoveTemplate.move(services))
                .command(ReadTemplate.read(services))
                .command(RenderTemplate.render(services))
                .command(GetParametersTemplate.getParameters(services))
                .build()
        );

    await app.run(process.argv.slice(2));
}
catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
}
