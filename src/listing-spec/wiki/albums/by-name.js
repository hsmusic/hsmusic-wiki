import {input} from '#composite';

import {exitWithoutDependency, exposeDependency}
  from '#composite/control-flow';
import {withThingsSortedAlphabetically} from '#composite/wiki-data';

export default {
  scope: 'wiki',
  directory: 'albums/by-name',
  target: 'album',

  stringsKey: 'listAlbums.byName',
  contentFunction: 'listAlbumsByName',

  seeAlsoListings: [
    'tracks/by-album',
  ],

  data: () => [
    exitWithoutDependency({
      dependency: 'albumData',
      value: input.value([]),
    }),

    withThingsSortedAlphabetically({
      things: 'albumData',
    }),

    exposeDependency({
      dependency: '#sortedThings',
    }),
  ],
};
