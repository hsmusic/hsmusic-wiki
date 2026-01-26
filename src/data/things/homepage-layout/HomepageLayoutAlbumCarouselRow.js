import {input, V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';
import {referenceList, soupyFind} from '#composite/wiki-properties';

import {HomepageLayoutRow} from './HomepageLayoutRow.js';

export class HomepageLayoutAlbumCarouselRow extends HomepageLayoutRow {
  static [Thing.friendlyName] = `Homepage Album Carousel Row`;

  static [Thing.getPropertyDescriptors] = (opts, {Album} = opts) => ({
    // Update & expose

    albums: referenceList({
      class: input.value(Album),
      find: soupyFind.input('album'),
    }),

    // Expose only

    isHomepageLayoutAlbumCarouselRow: exposeConstant(V(true)),
    type: exposeConstant(V('album carousel')),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Albums': {property: 'albums'},
    },
  };
}
