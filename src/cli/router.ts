import { createCommandGroup } from '@kelceyp/clibuilder';
import type { CoreServices } from '../core/Core.js';
import CreateCartridge from './commands/cartridge/create.js';

const create = (services: CoreServices) => {
    const cartridgeGroup = createCommandGroup('cartridge')
        .summary('Cartridge operations')
        .command(CreateCartridge.create(services))
        .build();

    return cartridgeGroup;
};

export default Object.freeze({ create });
