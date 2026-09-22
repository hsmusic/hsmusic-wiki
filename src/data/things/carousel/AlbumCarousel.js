import {inspect} from 'node:util';

import {input, V} from '#composite';
import Thing from '#thing';
import {isString} from '#validators';
import {parseAlbumCarouselTiles} from '#yaml';

import {exposeConstant, exposeUpdateValueOrContinue}
  from '#composite/control-flow';
import {constituteFrom} from '#composite/wiki-data';
import {simpleString, thing, thingList} from '#composite/wiki-properties';

export class AlbumCarousel extends Thing {
  static [Thing.friendlyName] = `Album Carousel';`
  static [Thing.wikiData] = 'albumCarouselData';

  static [Thing.getPropertyDescriptors] = ({AlbumCarouselTile}) => ({
    // Update & expose

    thing: thing(),

    seedSuffixFromThingProperty: simpleString(),

    seedSuffix: [
      exposeUpdateValueOrContinue({
        validate: input.value(isString),
      }),

      constituteFrom('thing', 'seedSuffixFromThingProperty'),
    ],

    // TODO: Should ensure tiles are of static value, so really just
    // be an album reference list, but...
    scriptlessTiles: thingList(V(AlbumCarouselTile)),

    tiles: thingList(V(AlbumCarouselTile)),

    // Expose only

    isAlbumCarousel: exposeConstant(V(true)),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Seed': {property: 'seedSuffix'},

      'Scriptless Tiles': {
        property: 'scriptlessTiles',
        transform: parseAlbumCarouselTiles,
      },

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
