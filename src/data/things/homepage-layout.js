import {input} from '#composite';
import find from '#find';

import {
  is,
  isCountingNumber,
  isString,
  isStringNonEmpty,
  oneOf,
  validateArrayItems,
  validateInstanceOf,
  validateReference,
} from '#validators';

import {exposeDependency} from '#composite/control-flow';
import {withResolvedReference} from '#composite/wiki-data';

import {
  color,
  name,
  referenceList,
  simpleString,
  wikiData,
} from '#composite/wiki-properties';

import Thing from './thing.js';

export class HomepageLayout extends Thing {
  static [Thing.getPropertyDescriptors] = ({HomepageLayoutRow}) => ({
    // Update & expose

    sidebarContent: simpleString(),

    navbarLinks: {
      flags: {update: true, expose: true},
      update: {validate: validateArrayItems(isStringNonEmpty)},
    },

    rows: {
      flags: {update: true, expose: true},

      update: {
        validate: validateArrayItems(validateInstanceOf(HomepageLayoutRow)),
      },
    },
  })
}

export class HomepageLayoutRow extends Thing {
  static [Thing.getPropertyDescriptors] = ({Album, Group}) => ({
    // Update & expose

    name: name('Unnamed Homepage Row'),

    type: {
      flags: {update: true, expose: true},

      update: {
        validate() {
          throw new Error(`'type' property validator must be overridden`);
        },
      },
    },

    color: color(),

    // Update only

    // These aren't necessarily used by every HomepageLayoutRow subclass, but
    // for convenience of providing this data, every row accepts all wiki data
    // arrays depended upon by any subclass's behavior.
    albumData: wikiData(Album),
    groupData: wikiData(Group),
  });
}

export class HomepageLayoutAlbumsRow extends HomepageLayoutRow {
  static [Thing.getPropertyDescriptors] = (opts, {Album, Group} = opts) => ({
    ...HomepageLayoutRow[Thing.getPropertyDescriptors](opts),

    // Update & expose

    type: {
      flags: {update: true, expose: true},
      update: {
        validate(value) {
          if (value !== 'albums') {
            throw new TypeError(`Expected 'albums'`);
          }

          return true;
        },
      },
    },

    displayStyle: {
      flags: {update: true, expose: true},

      update: {
        validate: is('grid', 'carousel'),
      },

      expose: {
        transform: (displayStyle) =>
          displayStyle ?? 'grid',
      },
    },

    sourceGroup: [
      {
        flags: {expose: true, update: true, compose: true},

        update: {
          validate:
            oneOf(
              is('new-releases', 'new-additions'),
              validateReference(Group[Thing.referenceType])),
        },

        expose: {
          transform: (value, continuation) =>
            (value === 'new-releases' || value === 'new-additions'
              ? value
              : continuation(value)),
        },
      },

      withResolvedReference({
        ref: input.updateValue(),
        data: 'groupData',
        find: input.value(find.group),
      }),

      exposeDependency({dependency: '#resolvedReference'}),
    ],

    sourceAlbums: referenceList({
      class: input.value(Album),
      find: input.value(find.album),
      data: 'albumData',
    }),

    countAlbumsFromGroup: {
      flags: {update: true, expose: true},
      update: {validate: isCountingNumber},
    },

    actionLinks: {
      flags: {update: true, expose: true},
      update: {validate: validateArrayItems(isString)},
    },
  });
}
