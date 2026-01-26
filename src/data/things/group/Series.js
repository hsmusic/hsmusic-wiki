import {inspect} from 'node:util';

import {colors} from '#cli';
import {input, V} from '#composite';
import Thing from '#thing';
import {is} from '#validators';

import {contentString, name, referenceList, soupyFind, thing}
  from '#composite/wiki-properties';

export class Series extends Thing {
  static [Thing.wikiData] = 'seriesData';

  static [Thing.getPropertyDescriptors] = ({Album, Group}) => ({
    // Update & expose

    name: name(V('Unnamed Series')),

    showAlbumArtists: {
      flags: {update: true, expose: true},
      update: {
        validate:
          is('all', 'differing', 'none'),
      },
    },

    description: contentString(),

    group: thing(V(Group)),

    albums: referenceList({
      class: input.value(Album),
      find: soupyFind.input('album'),
    }),

    // Update only

    find: soupyFind(),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Name': {property: 'name'},

      'Description': {property: 'description'},

      'Show Album Artists': {property: 'showAlbumArtists'},

      'Albums': {property: 'albums'},
    },
  };

  [inspect.custom](depth, options, inspect) {
    const parts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));

    if (depth >= 0) showGroup: {
      let group = null;
      try {
        group = this.group;
      } catch {
        break showGroup;
      }

      const groupName = group.name;
      const groupIndex = group.serieses.indexOf(this);

      const num =
        (groupIndex === -1
          ? 'indeterminate position'
          : `#${groupIndex + 1}`);

      parts.push(` (${colors.yellow(num)} in ${colors.green(`"${groupName}"`)})`);
    }

    return parts.join('');
  }
}
