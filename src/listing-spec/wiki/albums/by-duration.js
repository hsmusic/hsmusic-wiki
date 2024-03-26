import {input} from '#composite';
import {sortByCount} from '#sort';
import {filterByCount} from '#sugar';
import {getTotalDuration} from '#wiki-data';

import {exitWithoutDependency} from '#composite/control-flow';
import {withMappedList, withPropertyFromList} from '#composite/data';
import {withThingsSortedAlphabetically} from '#composite/wiki-data';

export default {
  scope: 'wiki',
  directory: 'albums/by-duration',
  target: 'album',

  stringsKey: 'listAlbums.byDuration',
  contentFunction: 'listAlbumsByDuration',

  data: () => [
    exitWithoutDependency({
      dependency: 'albumData',
      value: input.value([]),
    }),

    withThingsSortedAlphabetically({
      things: 'albumData',
    }).outputs({
      '#sortedThings': '#albums',
    }),

    withPropertyFromList({
      list: '#albums',
      property: input.value('tracks'),
    }),

    withMappedList({
      list: '#albums.tracks',
      map: input.value(getTotalDuration)
    }).outputs({
      '#mappedList': '#durations',
    }),

    {
      dependencies: ['#albums', '#durations'],
      compute: ({
        ['#albums']: albums,
        ['#durations']: durations,
      }) => {
        filterByCount(albums, durations);
        sortByCount(albums, durations, {greatestFirst: true});
        return {albums, durations};
      },
    },
  ],
};
