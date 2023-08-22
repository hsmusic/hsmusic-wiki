import {sortAlbumsTracksChronologically} from '#wiki-data';

import Thing from './thing.js';

export class ArtTag extends Thing {
  static [Thing.referenceType] = 'tag';

  static [Thing.getPropertyDescriptors] = ({
    Album,
    Track,
  }) => ({
    // Update & expose

    name: Thing.common.name('Unnamed Art Tag'),
    directory: Thing.common.directory(),
    color: Thing.common.color(),
    isContentWarning: Thing.common.flag(false),

    nameShort: {
      flags: {update: true, expose: true},

      expose: {
        dependencies: ['name'],
        transform: (value, {name}) =>
          value ?? name.replace(/ \(.*?\)$/, ''),
      },
    },

    // Update only

    albumData: Thing.common.wikiData(Album),
    trackData: Thing.common.wikiData(Track),

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
