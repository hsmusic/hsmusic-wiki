export const HOMEPAGE_LAYOUT_DATA_FILE = 'homepage.yaml';

import {inspect} from 'node:util';

import {colors} from '#cli';
import {input, V} from '#composite';
import Thing from '#thing';
import {empty} from '#sugar';

import {
  anyOf,
  is,
  isCountingNumber,
  isString,
  isStringNonEmpty,
  validateArrayItems,
  validateReference,
} from '#validators';

import {exposeConstant, exposeDependency} from '#composite/control-flow';
import {withResolvedReference} from '#composite/wiki-data';

import {
  color,
  contentString,
  name,
  referenceList,
  soupyFind,
  thing,
  thingList,
} from '#composite/wiki-properties';

export class HomepageLayout extends Thing {
  static [Thing.friendlyName] = `Homepage Layout`;
  static [Thing.wikiData] = 'homepageLayout';
  static [Thing.oneInstancePerWiki] = true;

  static [Thing.getPropertyDescriptors] = ({HomepageLayoutSection}) => ({
    // Update & expose

    sidebarContent: contentString(),

    navbarLinks: {
      flags: {update: true, expose: true},
      update: {validate: validateArrayItems(isStringNonEmpty)},
      expose: {transform: value => value ?? []},
    },

    sections: thingList({
      class: input.value(HomepageLayoutSection),
    }),

    // Expose only

    isHomepageLayout: exposeConstant(V(true)),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Homepage': {ignore: true},

      'Sidebar Content': {property: 'sidebarContent'},
      'Navbar Links': {property: 'navbarLinks'},
    },
  };

  static [Thing.getYamlLoadingSpec] = ({
    documentModes: {allInOne},
    thingConstructors: {
      HomepageLayout,
      HomepageLayoutSection,
    },
  }) => ({
    title: `Process homepage layout file`,
    file: HOMEPAGE_LAYOUT_DATA_FILE,

    documentMode: allInOne,
    documentThing: document => {
      if (document['Homepage']) {
        return HomepageLayout;
      }

      if (document['Section']) {
        return HomepageLayoutSection;
      }

      if (document['Row']) {
        switch (document['Row']) {
          case 'actions':
            return HomepageLayoutActionsRow;
          case 'album carousel':
            return HomepageLayoutAlbumCarouselRow;
          case 'album grid':
            return HomepageLayoutAlbumGridRow;
          default:
            throw new TypeError(`Unrecognized row type ${document['Row']}`);
        }
      }

      return null;
    },

    connect(results) {
      if (!empty(results) && !(results[0] instanceof HomepageLayout)) {
        throw new Error(`Expected 'Homepage' document at top of homepage layout file`);
      }

      const homepageLayout = results[0];
      const sections = [];

      let currentSection = null;
      let currentSectionRows = [];

      const closeCurrentSection = () => {
        if (currentSection) {
          for (const row of currentSectionRows) {
            row.section = currentSection;
          }

          currentSection.rows = currentSectionRows;
          sections.push(currentSection);

          currentSection = null;
          currentSectionRows = [];
        }
      };

      for (const entry of results.slice(1)) {
        if (entry instanceof HomepageLayout) {
          throw new Error(`Expected only one 'Homepage' document in total`);
        } else if (entry instanceof HomepageLayoutSection) {
          closeCurrentSection();
          currentSection = entry;
        } else if (entry instanceof HomepageLayoutRow) {
          if (currentSection) {
            currentSectionRows.push(entry);
          } else {
            throw new Error(`Expected a 'Section' document to add following rows into`);
          }
        }
      }

      closeCurrentSection();

      homepageLayout.sections = sections;
    },
  });
}

export class HomepageLayoutSection extends Thing {
  static [Thing.friendlyName] = `Homepage Section`;

  static [Thing.getPropertyDescriptors] = ({HomepageLayoutRow}) => ({
    // Update & expose

    name: name(V(`Unnamed Homepage Section`)),

    color: color(),

    rows: thingList({
      class: input.value(HomepageLayoutRow),
    }),

    // Expose only

    isHomepageLayoutSection: exposeConstant(V(true)),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Section': {property: 'name'},
      'Color': {property: 'color'},
    },
  };
}

export class HomepageLayoutRow extends Thing {
  static [Thing.friendlyName] = `Homepage Row`;

  static [Thing.getPropertyDescriptors] = ({HomepageLayoutSection}) => ({
    // Update & expose

    section: thing({
      class: input.value(HomepageLayoutSection),
    }),

    // Update only

    find: soupyFind(),

    // Expose only

    isHomepageLayoutRow: exposeConstant(V(true)),

    type: {
      flags: {expose: true},

      expose: {
        compute() {
          throw new Error(`'type' property validator must be overridden`);
        },
      },
    },
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Row': {ignore: true},
    },
  };

  [inspect.custom](depth) {
    const parts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));

    if (depth >= 0 && this.section) {
      const sectionName = this.section.name;
      const index = this.section.rows.indexOf(this);
      const rowNum =
        (index === -1
          ? 'indeterminate position'
          : `#${index + 1}`);
      parts.push(` (${colors.yellow(rowNum)} in ${colors.green(sectionName)})`);
    }

    return parts.join('');
  }
}

export class HomepageLayoutActionsRow extends HomepageLayoutRow {
  static [Thing.friendlyName] = `Homepage Actions Row`;

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    actionLinks: {
      flags: {update: true, expose: true},
      update: {validate: validateArrayItems(isString)},
    },

    // Expose only

    isHomepageLayoutActionsRow: exposeConstant(V(true)),
    type: exposeConstant(V('actions')),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Actions': {property: 'actionLinks'},
    },
  };
}

export class HomepageLayoutAlbumCarouselRow extends HomepageLayoutRow {
  static [Thing.friendlyName] = `Homepage Album Carousel Row`;

  static [Thing.getPropertyDescriptors] = (opts, {Album} = opts) => ({
    // Update & expose

    albums: referenceList({
      class: input.value(Album),
      find: soupyFind.input('album'),
    }),

    // Expose only

    isHomepageLayoutAlbumCarouselRow: exposeConstant(V(true)),
    type: exposeConstant(V('album carousel')),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Albums': {property: 'albums'},
    },
  };
}

export class HomepageLayoutAlbumGridRow extends HomepageLayoutRow {
  static [Thing.friendlyName] = `Homepage Album Grid Row`;

  static [Thing.getPropertyDescriptors] = (opts, {Album, Group} = opts) => ({
    // Update & expose

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
        find: soupyFind.input('group'),
      }),

      exposeDependency('#resolvedReference'),
    ],

    sourceAlbums: referenceList({
      class: input.value(Album),
      find: soupyFind.input('album'),
    }),

    countAlbumsFromGroup: {
      flags: {update: true, expose: true},
      update: {validate: isCountingNumber},
    },

    // Expose only

    isHomepageLayoutAlbumGridRow: exposeConstant(V(true)),
    type: exposeConstant(V('album grid')),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Group': {property: 'sourceGroup'},
      'Count': {property: 'countAlbumsFromGroup'},
      'Albums': {property: 'sourceAlbums'},
    },
  };
}
