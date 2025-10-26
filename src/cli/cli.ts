#!/usr/bin/env bun
import { resolve } from 'path';
import { homedir } from 'os';
import { create } from '@kelceyp/clibuilder';
import Core from '../core/Core.js';
import Router from './router.js';
import FindProjectRoot from './utils/findProjectRoot.js';

try {
    const projectBoundaryDir = FindProjectRoot.findProjectRoot();
    const sharedBoundaryDir = resolve(homedir(), '.swic');

    const services = Core.createServices({
        projectBoundaryDir,
        sharedBoundaryDir
    });

    const cartridgeGroup = Router.create(services);

    const app = create()
        .name('swic')
        .version('0.1.0')
        .description('SWIC - Stories Workflows Injected Context')
        .group(cartridgeGroup);

    await app.run(process.argv.slice(2));
} catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
}
