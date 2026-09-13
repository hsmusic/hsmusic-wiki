import {inspect} from 'node:util';

import {colors} from '#cli';
import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';
import {singleReference, soupyFind, thing} from '#composite/wiki-properties';

export class AlbumCarouselTile extends Thing {
  static [Thing.friendlyName] = `Album Carousel Tile';`
  static [Thing.wikiData] = 'albumCarouselTileData';

  static [Thing.getPropertyDescriptors] = ({AlbumCarousel}) => ({
    // Update & expose

    carousel: thing(V(AlbumCarousel)),

    album: singleReference({
      find: soupyFind.input('album'),
    }),

    // Update only

    find: soupyFind(),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Album': {property: 'album'},
    },
  };

  [inspect.custom](depth, options, inspect) {
    const parts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));

    if (this.carousel) {
      const tileIndex = this.carousel.tiles.indexOf(this);
      const tileNum =
        (tileIndex === -1
          ? 'indeterminate position'
          : `#${tileIndex + 1}`);

      parts.push(` (${colors.yellow(tileNum)} in `);

      if (depth >= 0) {
        const newOptions = {
          ...options,
          depth:
            (options.depth === null
              ? null
              : options.depth - 1),
        };

        parts.push(inspect(this.carousel, newOptions));
      } else {
        parts.push(Thing.inspectReference(this.carousel));
      }

      parts.push(`)`);
    }

    return parts.join('');
  }
}
