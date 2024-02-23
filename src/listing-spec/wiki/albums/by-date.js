import {input} from '#composite';
import {sortChronologically} from '#sort';

import {exitWithoutDependency} from '#composite/control-flow';

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

    {
      dependencies: ['albumData'],
      compute: ({albumData}) =>
        sortChronologically(
          albumData.filter(album => album.date)),
    },
  ],
};
