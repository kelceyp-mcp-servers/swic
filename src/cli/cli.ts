#!/usr/bin/env bun
import { create, createCommandGroup } from '@kelceyp/clibuilder';
import Core from '../core/Core.js';
import Createdoc from './commands/doc/create.js';
import Deletedoc from './commands/doc/delete.js';
import Editdoc from './commands/doc/edit.js';
import Listdoc from './commands/doc/list.js';
import Movedoc from './commands/doc/move.js';
import Readdoc from './commands/doc/read.js';

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
        );

    await app.run(process.argv.slice(2));
}
catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
}
