'use strict';

import {mkdir, writeFile} from 'node:fs/promises';
import * as path from 'node:path';

import FlexSearch from 'flexsearch';

import {logError, logInfo, logWarn} from '#cli';
import Thing from '#thing';

import {makeSearchIndexes} from './util/searchSchema.js';

async function populateSearchIndexes(indexes, wikiData) {
  // Albums, tracks
  for (const album of wikiData.albumData) {
    indexes.albums.add({
      reference: Thing.getReference(album),
      name: album.name,
      groups: album.groups.map(group => group.name),
    });

    for (const track of album.tracks) {
      indexes.tracks.add({
        reference: Thing.getReference(track),
        name: track.name,
        album: album.name,

        artists: [
          track.artistContribs.map(contrib => contrib.artist.name),
          ...track.artistContribs.map(contrib => contrib.artist.aliasNames)
        ],

        additionalNames:
          track.additionalNames.map(entry => entry.name),
      });
    }
  }

  // Artists
  for (const artist of wikiData.artistData) {
    if (artist.isAlias) {
      continue;
    }

    indexes.artists.add({
      reference: Thing.getReference(artist),
      names: [artist.name, ...artist.aliasNames],
    });
  }


async function exportIndexesToJson(indexes) {
  const searchData = {};

  // Map each index to an export promise, and await all.
  await Promise.all(
    Object.entries(indexes)
      .map(([indexName, index]) => {
        searchData[indexName] = {};
        return index.export((key, data) => {
          searchData[indexName][key] = data;
        });
      }));

  return searchData;
}

export async function writeSearchJson({
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

  const indexes = makeSearchIndexes(FlexSearch);

  await populateSearchIndexes(indexes, wikiData);

  const searchData = await exportIndexesToJson(indexes);

  const outputDirectory =
    path.join(wikiCachePath, 'search');

  const outputFile =
    path.join(outputDirectory, 'index.json');

  await mkdir(outputDirectory, {recursive: true});
  await writeFile(outputFile, JSON.stringify(searchData));

  logInfo`Search index successfully written.`;
}
