'use strict';

import {mkdir, writeFile} from 'node:fs/promises';
import * as path from 'node:path';

import FlexSearch from 'flexsearch';

import {logError, logInfo, logWarn} from '#cli';
import {makeSearchIndex, populateSearchIndex, searchSpec} from '#search-spec';
import {stitchArrays} from '#sugar';

async function exportIndexToJSON(index) {
  const results = {};

  await index.export((key, data) => {
    results[key] = data;
  })

  return results;
}

export async function writeSearchData({
  wikiCachePath,
  wikiData,
}) {
  if (!wikiCachePath) {
    throw new Error(`Expected wikiCachePath to write into`);
  }

  // Basic flow is:
  // 1. Define schema for type
  // 2. Add documents to index
  // 3. Save index to exportable json

  const keys =
    Object.keys(searchSpec);

  const descriptors =
    Object.values(searchSpec);

  const indexes =
    descriptors
      .map(descriptor =>
        makeSearchIndex(descriptor, {FlexSearch}));

  stitchArrays({
    index: indexes,
    descriptor: descriptors,
  }).forEach(({index, descriptor}) =>
      populateSearchIndex(index, descriptor, {wikiData}));

  const jsonIndexes =
    await Promise.all(indexes.map(exportIndexToJSON));

  const searchData =
    Object.fromEntries(
      stitchArrays({
        key: keys,
        value: jsonIndexes,
      }).map(({key, value}) => [key, value]));

  const outputDirectory =
    path.join(wikiCachePath, 'search');

  const outputFile =
    path.join(outputDirectory, 'index.json');

  await mkdir(outputDirectory, {recursive: true});
  await writeFile(outputFile, JSON.stringify(searchData));

  logInfo`Search index successfully written.`;
}
