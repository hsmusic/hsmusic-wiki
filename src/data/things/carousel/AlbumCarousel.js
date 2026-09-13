import {inspect} from 'node:util';

import {V} from '#composite';
import Thing from '#thing';
import {parseAlbumCarouselTiles} from '#yaml';

import {exposeConstant} from '#composite/control-flow';
import {thing, thingList} from '#composite/wiki-properties';

export class AlbumCarousel extends Thing {
  static [Thing.friendlyName] = `Album Carousel';`
  static [Thing.wikiData] = 'albumCarouselData';

  static [Thing.getPropertyDescriptors] = ({AlbumCarouselTile}) => ({
    // Update & expose

    thing: thing(),

    tiles: thingList(V(AlbumCarouselTile)),

    // Expose only

    isAlbumCarousel: exposeConstant(V(true)),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Tiles': {
        property: 'tiles',
        transform: parseAlbumCarouselTiles,
      },
    },
  };

  [inspect.custom](depth, options, inspect) {
    const parts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));

    if (this.thing) {
      if (depth >= 0) {
        const newOptions = {
          ...options,
          depth:
            (options.depth === null
              ? null
              : options.depth - 1),
        };

        parts.push(` for ${inspect(this.thing, newOptions)}`);
      } else {
        parts.push(` for ${Thing.inspectReference(this.thing)}`);
      }
    }

    return parts.join('');
  }
}
