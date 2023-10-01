import {input} from '#composite';
import {sortAlbumsTracksChronologically} from '#wiki-data';
import {isName} from '#validators';

import {exposeUpdateValueOrContinue} from '#composite/control-flow';

import {
  color,
  directory,
  flag,
  name,
  wikiData,
} from '#composite/wiki-properties';

import Thing from './thing.js';

export class ArtTag extends Thing {
  static [Thing.referenceType] = 'tag';

  static [Thing.getPropertyDescriptors] = ({Album, Track}) => ({
    // Update & expose

    name: name('Unnamed Art Tag'),
    directory: directory(),
    color: color(),
    isContentWarning: flag(false),

    nameShort: [
      exposeUpdateValueOrContinue({
        validate: input.value(isName),
      }),

      {
        dependencies: ['name'],
        compute: ({name}) =>
          name.replace(/ \([^)]*?\)$/, ''),
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
