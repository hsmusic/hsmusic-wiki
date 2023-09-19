import find from '#find';

import {
  compositeFrom,
  exposeDependency,
  input,
} from '#composite';

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

import Thing, {
  color,
  name,
  referenceList,
  simpleString,
  wikiData,
  withResolvedReference,
} from './thing.js';

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

    sourceGroup: compositeFrom(`HomepageLayoutAlbumsRow.sourceGroup`, [
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
    ]),

    sourceAlbums: referenceList({
      class: Album,
      find: find.album,
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
