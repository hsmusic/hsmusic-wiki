import Thing from './thing.js';

import find from '../../util/find.js';

export class HomepageLayout extends Thing {
  static [Thing.getPropertyDescriptors] = ({
    HomepageLayoutRow,

    validators: {
      isStringNonEmpty,
      validateArrayItems,
      validateInstanceOf,
    },
  }) => ({
    // Update & expose

    sidebarContent: Thing.common.simpleString(),

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
  static [Thing.getPropertyDescriptors] = ({
    Album,
    Group,
  }) => ({
    // Update & expose

    name: Thing.common.name('Unnamed Homepage Row'),

    type: {
      flags: {update: true, expose: true},

      update: {
        validate() {
          throw new Error(`'type' property validator must be overridden`);
        },
      },
    },

    color: Thing.common.color(),

    // Update only

    // These aren't necessarily used by every HomepageLayoutRow subclass, but
    // for convenience of providing this data, every row accepts all wiki data
    // arrays depended upon by any subclass's behavior.
    albumData: Thing.common.wikiData(Album),
    groupData: Thing.common.wikiData(Group),
  });
}

export class HomepageLayoutAlbumsRow extends HomepageLayoutRow {
  static [Thing.getPropertyDescriptors] = (opts, {
    Album,
    Group,

    validators: {
      isCountingNumber,
      isString,
      validateArrayItems,
      validateFromConstants,
    },
  } = opts) => ({
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
        validate: validateFromConstants('grid', 'carousel'),
      },

      expose: {
        transform: (displayStyle) =>
          displayStyle ?? 'grid',
      },
    },

    sourceGroupByRef: Thing.common.singleReference(Group),
    sourceAlbumsByRef: Thing.common.referenceList(Album),

    countAlbumsFromGroup: {
      flags: {update: true, expose: true},
      update: {validate: isCountingNumber},
    },

    actionLinks: {
      flags: {update: true, expose: true},
      update: {validate: validateArrayItems(isString)},
    },

    // Expose only

    sourceGroup: Thing.common.dynamicThingFromSingleReference(
      'sourceGroupByRef',
      'groupData',
      find.group
    ),

    sourceAlbums: Thing.common.dynamicThingsFromReferenceList(
      'sourceAlbumsByRef',
      'albumData',
      find.album
    ),
  });
}
