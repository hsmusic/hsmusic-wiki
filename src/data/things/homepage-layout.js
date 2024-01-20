import {input} from '#composite';
import find from '#find';
import Thing from '#thing';

import {
  anyOf,
  is,
  isCountingNumber,
  isString,
  isStringNonEmpty,
  validateArrayItems,
  validateInstanceOf,
  validateReference,
} from '#validators';

import {exposeDependency} from '#composite/control-flow';
import {withResolvedReference} from '#composite/wiki-data';
import {color, contentString, name, referenceList, wikiData}
  from '#composite/wiki-properties';

export class HomepageLayout extends Thing {
  static [Thing.friendlyName] = `Homepage Layout`;

  static [Thing.getPropertyDescriptors] = ({HomepageLayoutRow}) => ({
    // Update & expose

    sidebarContent: contentString(),

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
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Sidebar Content': {property: 'sidebarContent'},
      'Navbar Links': {property: 'navbarLinks'},
    },

    ignoredFields: ['Homepage'],
  };
}

export class HomepageLayoutRow extends Thing {
  static [Thing.friendlyName] = `Homepage Row`;

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

    // These wiki data arrays aren't necessarily used by every subclass, but
    // to the convenience of providing these, the superclass accepts all wiki
    // data arrays depended upon by any subclass.

    albumData: wikiData({
      class: input.value(Album),
    }),

    groupData: wikiData({
      class: input.value(Group),
    }),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Row': {property: 'name'},
      'Color': {property: 'color'},
      'Type': {property: 'type'},
    },
  };
}

export class HomepageLayoutAlbumsRow extends HomepageLayoutRow {
  static [Thing.friendlyName] = `Homepage Albums Row`;

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
            anyOf(
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

  static [Thing.yamlDocumentSpec] = Thing.extendDocumentSpec(HomepageLayoutRow, {
    fields: {
      'Display Style': {property: 'displayStyle'},
      'Group': {property: 'sourceGroup'},
      'Count': {property: 'countAlbumsFromGroup'},
      'Albums': {property: 'sourceAlbums'},
      'Actions': {property: 'actionLinks'},
    },
  });
}
