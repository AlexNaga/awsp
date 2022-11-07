import fs from 'fs-extra';

export const readFile = async (filePath: string) => fs.readFile(filePath, 'utf-8');
