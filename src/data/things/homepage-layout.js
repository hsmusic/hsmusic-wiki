import find from '#find';

import {
  is,
  isCountingNumber,
  isString,
  isStringNonEmpty,
  validateArrayItems,
  validateInstanceOf,
} from '#validators';

import Thing, {
  color,
  name,
  referenceList,
  resolvedReference,
  resolvedReferenceList,
  simpleString,
  singleReference,
  wikiData,
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

    sourceGroupByRef: singleReference(Group),
    sourceAlbumsByRef: referenceList(Album),

    countAlbumsFromGroup: {
      flags: {update: true, expose: true},
      update: {validate: isCountingNumber},
    },

    actionLinks: {
      flags: {update: true, expose: true},
      update: {validate: validateArrayItems(isString)},
    },

    // Expose only

    sourceGroup: resolvedReference({
      ref: 'sourceGroupByRef',
      data: 'groupData',
      find: find.group,
    }),

    sourceAlbums: resolvedReferenceList({
      list: 'sourceAlbumsByRef',
      data: 'albumData',
      find: find.album,
    }),
  });
}
