#!/usr/bin/env bun
import { resolve } from 'path';
import { homedir } from 'os';
import { create, createCommandGroup } from '@kelceyp/clibuilder';
import Core from '../core/Core.js';
import CreateCartridge from './commands/cartridge/create.js';
import DeleteCartridge from './commands/cartridge/delete.js';
import EditCartridge from './commands/cartridge/edit.js';
import ListCartridge from './commands/cartridge/list.js';
import ReadCartridge from './commands/cartridge/read.js';
import FindProjectRoot from '../core/utils/findProjectRoot.js';

try {
    const projectBoundaryDir = FindProjectRoot.findProjectRoot();
    const sharedBoundaryDir = resolve(homedir(), '.swic');

    const services = Core.createServices({
        projectBoundaryDir,
        sharedBoundaryDir
    });

    const app = create()
        .name('swic')
        .version('0.1.0')
        .description('SWIC - Stories Workflows Injected Context')
        .group(
            createCommandGroup('cartridge')
                .summary('Cartridge operations')
                .command(CreateCartridge.create(services))
                .command(DeleteCartridge.create(services))
                .command(EditCartridge.create(services))
                .command(ListCartridge.create(services))
                .command(ReadCartridge.create(services))
                .build()
        );

    await app.run(process.argv.slice(2));
}
catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
}
