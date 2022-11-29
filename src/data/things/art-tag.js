import Thing from './thing.js';

import {
  sortAlbumsTracksChronologically,
} from '../../util/wiki-data.js';

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

    // Update only

    albumData: Thing.common.wikiData(Album),
    trackData: Thing.common.wikiData(Track),

    // Expose only

    // Previously known as: (tag).things
    taggedInThings: {
      flags: {expose: true},

      expose: {
        dependencies: ['albumData', 'trackData'],
        compute: ({albumData, trackData, [ArtTag.instance]: artTag}) =>
          sortAlbumsTracksChronologically(
            [...albumData, ...trackData]
              .filter(({artTags}) => artTags.includes(artTag)),
            {getDate: o => o.coverArtDate}),
      },
    },
  });
}
