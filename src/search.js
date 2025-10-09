'use strict';

import {createHash} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import * as path from 'node:path';

import {compress} from 'compress-json';
import FlexSearch from 'flexsearch';
import {pack} from 'msgpackr';

import {logWarn} from '#cli';
import {makeSearchIndex} from '#search-shape';
import searchSpec from '#search-select';
import {stitchArrays} from '#sugar';
import {checkIfImagePathHasCachedThumbnails, getThumbnailEqualOrSmaller}
  from '#thumbs';

// TODO: This function basically mirrors bind-utilities.js, which isn't
// exactly robust, but... binding might need some more thought across the
// codebase in *general.*
function bindSearchUtilities({
  checkIfImagePathHasCachedThumbnails,
  getThumbnailEqualOrSmaller,
  thumbsCache,
  urls,
}) {
  const bound = {
    urls,
  };

  bound.checkIfImagePathHasCachedThumbnails =
    (imagePath) =>
      checkIfImagePathHasCachedThumbnails(imagePath, thumbsCache);

  bound.getThumbnailEqualOrSmaller =
    (preferred, imagePath) =>
      getThumbnailEqualOrSmaller(preferred, imagePath, thumbsCache);

  return bound;
}

function populateSearchIndex(index, descriptor, wikiData, utilities) {
  for (const thing of descriptor.select(wikiData)) {
    const reference = thing.constructor.getReference(thing);

    let processed;
    try {
      processed = descriptor.process(thing, utilities);
    } catch (caughtError) {
      throw new Error(
        `Failed to process searchable thing ${reference}`,
        {cause: caughtError});
    }

    index.add({reference, ...processed});
  }
}

async function serializeIndex(index) {
  const results = {};

  await index.export((key, data) => {
    if (data === undefined) {
      return;
    }

    if (typeof data !== 'string') {
      logWarn`Got something besides a string from index.export(), skipping:`;
      console.warn(key, data);
      return;
    }

    results[key] = JSON.parse(data);
  });

  return results;
}

export async function writeSearchData({
  thumbsCache,
  urls,
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

  const utilities =
    bindSearchUtilities({
      checkIfImagePathHasCachedThumbnails,
      getThumbnailEqualOrSmaller,
      thumbsCache,
      urls,
      wikiData,
    });

  stitchArrays({
    index: indexes,
    descriptor: descriptors,
  }).forEach(({index, descriptor}) =>
      populateSearchIndex(index, descriptor, wikiData, utilities));

  const serializedIndexes =
    await Promise.all(indexes.map(serializeIndex));

  const packedIndexes =
    serializedIndexes
      .map(data => compress(data))
      .map(data => pack(data));

  const outputDirectory =
    path.join(wikiCachePath, 'search');

  const mainIndexFile =
    path.join(outputDirectory, 'index.json');

  const mainIndexJSON =
    JSON.stringify(
      Object.fromEntries(
        stitchArrays({
          key: keys,
          buffer: packedIndexes,
        }).map(({key, buffer}) => {
          const md5 = createHash('md5');
          md5.write(buffer);

          const value = {
            md5: md5.digest('hex'),
          };

          return [key, value];
        })));


  await mkdir(outputDirectory, {recursive: true});

  await Promise.all(
    stitchArrays({
      key: keys,
      buffer: packedIndexes,
    }).map(({key, buffer}) =>
        writeFile(
          path.join(outputDirectory, key + '.json.msgpack'),
          buffer)));

  await writeFile(mainIndexFile, mainIndexJSON);
}
