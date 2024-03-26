import {input} from '#composite';
import {sortByCount} from '#sort';
import {filterByCount} from '#sugar';

import {exitWithoutDependency} from '#composite/control-flow';
import {withPropertyFromList} from '#composite/data';
import {withThingsSortedAlphabetically} from '#composite/wiki-data';

export default {
  scope: 'wiki',
  directory: 'albums/by-tracks',
  target: 'album',

  stringsKey: 'listAlbums.byTracks',
  contentFunction: 'listAlbumsByTracks',

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

    withPropertyFromList({
      list: '#albums.tracks',
      property: input.value('length'),
    }).outputs({
      '#albums.tracks.length': '#counts',
    }),

    {
      dependencies: ['#albums', '#counts'],
      compute: ({
        ['#albums']: albums,
        ['#counts']: counts,
      }) => {
        filterByCount(albums, counts);
        sortByCount(albums, counts, {greatestFirst: true});
        return {albums, counts};
      },
    },
  ],
};
