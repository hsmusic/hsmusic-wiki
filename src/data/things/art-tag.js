import {input} from '#composite';
import find from '#find';
import {isName} from '#validators';
import {sortAlbumsTracksChronologically} from '#wiki-data';

import {exposeUpdateValueOrContinue} from '#composite/control-flow';

import {
  color,
  directory,
  flag,
  referenceList,
  reverseReferenceList,
  name,
  wikiData,
} from '#composite/wiki-properties';

import Thing from './thing.js';

export class ArtTag extends Thing {
  static [Thing.referenceType] = 'tag';
  static [Thing.friendlyName] = `Art Tag`;

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

    directDescendantTags: referenceList({
      class: input.value(ArtTag),
      find: input.value(find.artTag),
      data: 'artTagData',
    }),

    // Update only

    albumData: wikiData({
      class: input.value(Album),
    }),

    artTagData: wikiData({
      class: input.value(ArtTag),
    }),

    trackData: wikiData({
      class: input.value(Track),
    }),

    // Expose only

    taggedInThings: {
      flags: {expose: true},

      expose: {
        dependencies: ['this', 'albumData', 'trackData'],
        compute: ({this: artTag, albumData, trackData}) =>
          sortAlbumsTracksChronologically(
            [...albumData, ...trackData]
              .filter(({artTags}) => artTags.includes(artTag)),
            {getDate: thing => thing.coverArtDate ?? thing.date}),
      },
    },

    directAncestorTags: reverseReferenceList({
      data: 'artTagData',
      list: input.value('directDescendantTags'),
    }),
  });
}
