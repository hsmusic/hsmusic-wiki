#!/usr/bin/env node

'use strict';

import {
  writeFile,
} from 'node:fs/promises';

import {
  logWarn,
  logInfo,
  logError,
} from '#cli';

import Thing from '#thing';

import FlexSearch from 'flexsearch';

export async function writeSearchIndex(search_index_path, wikiData) {

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
    })
  }

  wikiData.albumData.forEach((album) => {
    indexes.albums.add({
      reference: Thing.getReference(album),
      name: album.name,
      groups: album.groups.map(group => group.name),
    })

    album.tracks.forEach((track) => {
      indexes.tracks.add({
        reference: Thing.getReference(track),
        album: album.name,
        track: track.name,
        artists: [
          track.artistContribs.map(contrib => contrib.artist.name),
          ...track.artistContribs.map(contrib => contrib.artist.aliasNames)
        ],
        additionalNames: track.additionalNames.map(entry => entry.name)
      })
    })
  });

  wikiData.artistData
  .filter(artist => !artist.isAlias)
  .forEach((artist) => {
    indexes.artists.add({
      reference: Thing.getReference(artist),
      names: [
        artist.name,
        ...artist.aliasNames
      ]
    })
  })

  // Export indexes to json
  let searchData = {}

  await Promise.all(
    Object.entries(indexes)
    .map(pair => {
      const [index_name, index] = pair
      searchData[index_name] = {}
      return index.export((key, data) => {
        searchData[index_name][key] = data
      });
    })
  )

  writeFile(search_index_path, JSON.stringify(searchData))
}
