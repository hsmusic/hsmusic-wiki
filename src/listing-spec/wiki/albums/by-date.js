import {input} from '#composite';

import {exposeDependency, exitWithoutDependency}
  from '#composite/control-flow';
import {withFilteredList, withMappedList} from '#composite/data';
import {withThingsSortedChronologically} from '#composite/wiki-data';

export default {
  scope: 'wiki',
  directory: 'albums/by-date',
  target: 'album',

  stringsKey: 'listAlbums.byDate',
  contentFunction: 'listAlbumsByDate',

  seeAlsoListings: [
    'tracks/by-date',
  ],

  data: () => [
    exitWithoutDependency({
      dependency: 'albumData',
      value: input.value([]),
    }),

    withMappedList({
      list: 'albumData',
      map: input.value(album => !!album.date),
    }).outputs({
      '#mappedList': '#dateFilter',
    }),

    withFilteredList({
      list: 'albumData',
      filter: '#dateFilter',
    }).outputs({
      '#filteredList': '#datedAlbums',
    }),

    withThingsSortedChronologically({
      things: '#datedAlbums',
    }),

    exposeDependency({
      dependency: '#sortedThings',
    }),
  ],
};
