import {exposeUpdateValueOrContinue} from '#composite';
import {sortAlbumsTracksChronologically} from '#wiki-data';
import {isName} from '#validators';

import Thing, {
  color,
  directory,
  flag,
  name,
  wikiData,
} from './thing.js';

export class ArtTag extends Thing {
  static [Thing.referenceType] = 'tag';

  static [Thing.getPropertyDescriptors] = ({Album, Track}) => ({
    // Update & expose

    name: name('Unnamed Art Tag'),
    directory: directory(),
    color: color(),
    isContentWarning: flag(false),

    nameShort: [
      exposeUpdateValueOrContinue(),

      {
        dependencies: ['name'],
        compute: ({name}) =>
          name.replace(/ \([^)]*?\)$/, ''),
      },

      {
        flags: {update: true, expose: true},
        validate: {isName},
      },
    ],

    // Update only

    albumData: wikiData(Album),
    trackData: wikiData(Track),

    // Expose only

    taggedInThings: {
      flags: {expose: true},

      expose: {
        dependencies: ['this', 'albumData', 'trackData'],
        compute: ({this: artTag, albumData, trackData}) =>
          sortAlbumsTracksChronologically(
            [...albumData, ...trackData]
              .filter(({artTags}) => artTags.includes(artTag)),
            {getDate: o => o.coverArtDate}),
      },
    },
  });
}
