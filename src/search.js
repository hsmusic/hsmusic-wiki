'use strict';

import {mkdir, writeFile} from 'node:fs/promises';
import * as path from 'node:path';

import FlexSearch from 'flexsearch';

import {logError, logInfo, logWarn} from '#cli';
import Thing from '#thing';

import {makeSearchIndexes} from './util/searchSchema.js';

const DEBUG_DOC_GEN = true;

async function populateSearchIndexes(indexes, wikiData) {

  const haveLoggedDocOfThing = {}; // debugging only

  function readCollectionIntoIndex(
    collection,
    index,
    mapper
  ) {
    // Add a doc for mapper(thing) to index for each thing in collection.
    for (const thing of collection) {
      const reference = Thing.getReference(thing);
      try {
        const doc = {
          reference,
          ...mapper(thing)
        };
        // Print description of output doc, if debugging enabled.
        if (DEBUG_DOC_GEN && !haveLoggedDocOfThing[thing.constructor.name]) {
          logInfo(JSON.stringify(doc, null, 2));
          haveLoggedDocOfThing[thing.constructor.name] = true;
        }
        index.add(doc);
      } catch (e) {
        // Enrich error context
        logError`Failed to write searchable doc for thing ${reference}`;
        const thingSchemaSummary = Object.fromEntries(
          Object.entries(thing)
          .map(([k, v]) => [k, v ? (v.constructor.name || typeof v) : v])
        );
        logError("Availible properties: " + JSON.stringify(thingSchemaSummary, null, 2));
        throw e;
      }
    }
  }

  // Albums
  readCollectionIntoIndex(
    wikiData.albumData,
    indexes.albums,
    album => ({
      name: album.name,
      groups: album.groups.map(group => group.name),
    })
  );

  // Tracks
  readCollectionIntoIndex(
    wikiData.trackData,
    indexes.tracks,
    track => ({
      name: track.name,
      album: track.album.name,
      artists: [
        track.artistContribs.map(contrib => contrib.artist.name),
        ...track.artistContribs.map(contrib => contrib.artist.aliasNames)
      ].flat(),
      additionalNames: track.additionalNames.map(entry => entry.name),
    })
  );

  // Artists
  const realArtists =
    wikiData.artistData
      .filter(artist => !artist.isAlias);

  readCollectionIntoIndex(
    realArtists,
    indexes.artists,
    artist => ({
      names: [artist.name, ...artist.aliasNames],
    })
  );


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
