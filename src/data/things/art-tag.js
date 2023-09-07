import {sortAlbumsTracksChronologically} from '#wiki-data';

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

    nameShort: {
      flags: {update: true, expose: true},

      expose: {
        dependencies: ['name'],
        transform: (value, {name}) =>
          value ?? name.replace(/ \(.*?\)$/, ''),
      },
    },

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
