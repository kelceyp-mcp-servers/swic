import { resolve, dirname } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';

const findProjectRoot = (startPath: string = process.cwd()): string => {
    let currentPath = resolve(startPath);
    const root = resolve('/');
    const homeSwic = resolve(homedir(), '.swic');

    while (currentPath !== root) {
        const swicPath = resolve(currentPath, '.swic');

        if (swicPath === homeSwic) {
            throw new Error('Not in a project directory (found ~/.swic instead). Run swic from within a project.');
        }

        if (existsSync(swicPath)) {
            return swicPath;
        }

        currentPath = dirname(currentPath);
    }

    throw new Error('Could not find .swic directory. Are you in a SWIC project?');
};

export default Object.freeze({ findProjectRoot });
