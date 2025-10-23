import { Command } from 'commander';
import { stdin } from 'process';
import chalk from 'chalk';
import type { CoreServices } from '../../../core/Core.js';

const readStdin = async (): Promise<string> => {
    const chunks: Buffer[] = [];

    for await (const chunk of stdin) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks).toString('utf8');
};

const create = (services: CoreServices): Command => {
    return new Command('create')
        .description('Create a new cartridge')
        .argument('<scope>', 'Scope: project or shared')
        .argument('<path>', 'Cartridge path (e.g., auth/jwt-setup)')
        .option('-c, --content <text>', 'Cartridge content (reads from stdin if not provided)')
        .action(async (scope, path, options) => {
            try {
                let content: string;

                if (options.content) {
                    content = options.content;
                } else {
                    content = await readStdin();
                }

                const result = await services.cartridgeService.create({
                    address: { kind: 'path', scope, path },
                    content
                });

                console.log(result.id);
                console.error(chalk.green(`Created cartridge: ${result.id} at ${path}`));
            } catch (error: any) {
                console.error(chalk.red(`Error: ${error.message}`));
                if (error.code) {
                    console.error(chalk.red(`Code: ${error.code}`));
                }
                process.exit(1);
            }
        });
};

export default Object.freeze({ create });
