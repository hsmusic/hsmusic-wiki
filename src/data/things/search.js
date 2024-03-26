'use strict';

import {writeFile} from 'node:fs/promises';
import * as path from 'node:path';

import FlexSearch from 'flexsearch';

import {logError, logInfo, logWarn} from '#cli';
import Thing from '#thing';

export async function writeSearchIndex({
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

  // Copy this block directly into clientSearch.js
  const indexes = {
    albums: new FlexSearch.Document({
      id: "reference",
      index: ["name", "groups"],
    }),

    tracks: new FlexSearch.Document({
      id: "reference",
      index: ["track", "album", "artists", "directory", "additionalNames"],
    }),

    artists: new FlexSearch.Document({
      id: "reference",
      index: ["names"],
    }),
  };

  for (const album of wikiData.albumData) {
    indexes.albums.add({
      reference: Thing.getReference(album),
      name: album.name,
      groups: album.groups.map(group => group.name),
    });

    for (const track of album.tracks) {
      indexes.tracks.add({
        reference: Thing.getReference(track),
        album: album.name,
        track: track.name,

        artists: [
          track.artistContribs.map(contrib => contrib.artist.name),
          ...track.artistContribs.map(contrib => contrib.artist.aliasNames)
        ],

        additionalNames:
          track.additionalNames.map(entry => entry.name),
      });
    }
  }

  for (const artist of wikiData.artistData) {
    if (artist.isAlias) {
      continue;
    }

    indexes.artists.add({
      reference: Thing.getReference(artist),
      names: [artist.name, ...artist.aliasNames],
    });
  }

  // Export indexes to json
  const searchData = {}

  await Promise.all(
    Object.entries(indexes)
      .map(([indexName, index]) => {
        searchData[indexName] = {};
        return index.export((key, data) => {
          searchData[indexName][key] = data
        });
      }));

  const outputFile =
    path.join(wikiCachePath, 'search-index.json');

  await writeFile(outputFile, JSON.stringify(searchData));

  logInfo`Search index successfully written.`;
}
