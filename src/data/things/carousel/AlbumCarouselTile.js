import {inspect} from 'node:util';

import {colors} from '#cli';
import {input, V} from '#composite';
import Thing from '#thing';
import {isDate, isCarouselUpdateFrequency} from '#validators';
import {parseDate} from '#yaml';

import {exposeConstant, exposeUpdateValueOrContinue}
  from '#composite/control-flow';
import {constituteFrom} from '#composite/wiki-data';
import {referenceList, singleReference, soupyFind, thing}
  from '#composite/wiki-properties';

export class AlbumCarouselTile extends Thing {
  static [Thing.friendlyName] = `Album Carousel Tile';`
  static [Thing.wikiData] = 'albumCarouselTileData';

  static [Thing.getPropertyDescriptors] = ({AlbumCarousel}) => ({
    // Update & expose

    carousel: thing(V(AlbumCarousel)),

    anchorDate: [
      exposeUpdateValueOrContinue({
        validate: input.value(isDate),
      }),

      constituteFrom('carousel', V('anchorDate')),
    ],

    updateFrequency: [
      exposeUpdateValueOrContinue({
        validate: input.value(isCarouselUpdateFrequency),
      }),

      constituteFrom('carousel', V('updateFrequency')),
    ],

    album: singleReference({
      find: soupyFind.input('album'),
    }),

    randomizeFromAlbums: referenceList({
      find: soupyFind.input('album'),
    }),

    rotateFromAlbums: referenceList({
      find: soupyFind.input('album'),
    }),

    // Update only

    find: soupyFind(),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Anchor Date': {property: 'anchorDate', transform: parseDate},
      'Update Frequency': {property: 'updateFrequency'},

      'Album': {property: 'album'},
      'Randomize From': {property: 'randomizeFromAlbums'},
      'Rotate From': {property: 'rotateFromAlbums'},
    },

    invalidFieldCombinations: [
      {
        message: `Don't combine multiple ways of selecting albums in one tile`,
        fields: ['Album', 'Randomize From', 'Rotate From'],
      },
    ],
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
