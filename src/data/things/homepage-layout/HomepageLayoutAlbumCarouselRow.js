import {input, V} from '#composite';
import Thing from '#thing';
import {parseAlbumCarousel} from '#yaml';

import {exposeConstant} from '#composite/control-flow';
import {thing} from '#composite/wiki-properties';

import {HomepageLayoutRow} from './HomepageLayoutRow.js';

export class HomepageLayoutAlbumCarouselRow extends HomepageLayoutRow {
  static [Thing.friendlyName] = `Homepage Album Carousel Row`;

  static [Thing.getPropertyDescriptors] = ({AlbumCarousel}) => ({
    // Update & expose

    carousel: thing(V(AlbumCarousel)),

    // Expose only

    isHomepageLayoutAlbumCarouselRow: exposeConstant(V(true)),
    type: exposeConstant(V('album carousel')),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Carousel': {
        property: 'carousel',
        transform: parseAlbumCarousel,
      },
    },
  };
}
