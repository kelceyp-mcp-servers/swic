import { Command } from 'commander';
import type { CoreServices } from '../core/Core.js';
import CreateCartridge from './commands/cartridge/create.js';

const create = (services: CoreServices): Command => {
    const program = new Command('swic')
        .description('SWIC - Stories Workflows Injected Context')
        .version('0.1.0');

    const cartridge = new Command('cartridge')
        .description('Cartridge operations');

    cartridge.addCommand(CreateCartridge.create(services));

    program.addCommand(cartridge);

    return program;
};

export default Object.freeze({ create });
