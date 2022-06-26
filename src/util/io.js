/** @format */

// Utility functions for interacting with files and other external data
// interfacey constructs.

import {readdir} from 'fs/promises';
import * as path from 'path';

export async function findFiles(dataPath, {
  filter = () => true,
  joinParentDirectory = true,
} = {}) {
  return (await readdir(dataPath))
    .filter((file) => filter(file))
    .map((file) => (joinParentDirectory ? path.join(dataPath, file) : file));
}
