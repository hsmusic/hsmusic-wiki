import {input} from '#composite';

import {exposeDependency, exitWithoutDependency}
  from '#composite/control-flow';
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

    withThingsSortedChronologically({
      things: 'albumData',
    }),

    exposeDependency({
      dependency: '#sortedThings',
    }),
  ],
};
