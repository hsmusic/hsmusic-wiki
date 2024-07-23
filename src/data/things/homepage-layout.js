export const HOMEPAGE_LAYOUT_DATA_FILE = 'homepage.yaml';

import {input} from '#composite';
import find from '#find';
import Thing from '#thing';

import {
  anyOf,
  is,
  isContentString,
  isCountingNumber,
  isStringNonEmpty,
  validateArrayItems,
  validateInstanceOf,
  validateReference,
} from '#validators';

import {exposeDependency} from '#composite/control-flow';
import {withParsedContentStringNodesFromList, withResolvedReference}
  from '#composite/wiki-data';
import {color, contentString, contentStringList, name, referenceList, wikiData}
  from '#composite/wiki-properties';

export class HomepageLayout extends Thing {
  static [Thing.friendlyName] = `Homepage Layout`;

  static [Thing.getPropertyDescriptors] = ({HomepageLayoutRow}) => ({
    // Update & expose

    sidebarContent: contentString(),
    navbarLinks: contentStringList(),

    rows: {
      flags: {update: true, expose: true},

      update: {
        validate: validateArrayItems(validateInstanceOf(HomepageLayoutRow)),
      },
    },
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Homepage': {ignore: true},

      'Sidebar Content': {property: 'sidebarContent'},
      'Navbar Links': {property: 'navbarLinks'},
    },
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

    actionLinks: contentStringList(),
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

  static [Thing.getYamlLoadingSpec] = ({
    documentModes: {headerAndEntries}, // Kludge, see below
    thingConstructors: {
      HomepageLayout,
      HomepageLayoutAlbumsRow,
    },
  }) => ({
    title: `Process homepage layout file`,

    // Kludge: This benefits from the same headerAndEntries style messaging as
    // albums and tracks (for example), but that document mode is designed to
    // support multiple files, and only one is actually getting processed here.
    files: [HOMEPAGE_LAYOUT_DATA_FILE],

    documentMode: headerAndEntries,
    headerDocumentThing: HomepageLayout,
    entryDocumentThing: document => {
      switch (document['Type']) {
        case 'albums':
          return HomepageLayoutAlbumsRow;
        default:
          throw new TypeError(`No processDocument function for row type ${document['Type']}!`);
      }
    },

    save(results) {
      if (!results[0]) {
        return;
      }

      const {header: homepageLayout, entries: rows} = results[0];
      Object.assign(homepageLayout, {rows});
      return {homepageLayout};
    },
  });
}
