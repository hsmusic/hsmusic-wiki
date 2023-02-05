// Utility functions for interacting with files and other external data
// interfacey constructs.

import {readdir} from 'fs/promises';
import * as path from 'path';

export async function findFiles(dataPath, {
  filter = () => true,
  joinParentDirectory = true,
} = {}) {
  let files;
  try {
    files = await readdir(dataPath);
  } catch (error) {
    throw Object.assign(
      new AggregateError([error], `Failed to list files from ${dataPath}`),
      {code: error.code});
  }

  return files
    .filter((file) => filter(file))
    .map((file) => (joinParentDirectory ? path.join(dataPath, file) : file));
}
