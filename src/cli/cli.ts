#!/usr/bin/env node
import { resolve } from 'path';
import { homedir } from 'os';
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

    const program = Router.create(services);
    await program.parseAsync(process.argv);
} catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
}
