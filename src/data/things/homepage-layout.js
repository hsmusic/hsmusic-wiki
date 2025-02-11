export const HOMEPAGE_LAYOUT_DATA_FILE = 'homepage.yaml';

import {inspect} from 'node:util';

import {colors} from '#cli';
import {input} from '#composite';
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

import {exposeDependency} from '#composite/control-flow';
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

  static [Thing.getPropertyDescriptors] = ({HomepageLayoutSection}) => ({
    // Update & expose

    sidebarContent: contentString(),

    navbarLinks: {
      flags: {update: true, expose: true},
      update: {validate: validateArrayItems(isStringNonEmpty)},
    },

    sections: thingList({
      class: input.value(HomepageLayoutSection),
    }),
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
      HomepageLayoutAlbumsRow,
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
          case 'albums':
            return HomepageLayoutAlbumsRow;
          default:
            throw new TypeError(`Unrecognized row type ${document['Row']}`);
        }
      }

      return null;
    },

    save(results) {
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
          currentSectionRows.push(entry);
        }
      }

      closeCurrentSection();

      homepageLayout.sections = sections;

      return {homepageLayout};
    },
  });
}

export class HomepageLayoutSection extends Thing {
  static [Thing.friendlyName] = `Homepage Section`;

  static [Thing.getPropertyDescriptors] = ({HomepageLayoutRow}) => ({
    // Update & expose

    name: name(`Unnamed Homepage Section`),

    color: color(),

    rows: thingList({
      class: input.value(HomepageLayoutRow),
    }),
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

    type: {
      flags: {update: true, expose: true},

      update: {
        validate() {
          throw new Error(`'type' property validator must be overridden`);
        },
      },
    },

    section: thing({
      class: input.value(HomepageLayoutSection),
    }),

    // Update only

    find: soupyFind(),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Row': {property: 'type'},
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
        find: soupyFind.input('group'),
      }),

      exposeDependency({dependency: '#resolvedReference'}),
    ],

    sourceAlbums: referenceList({
      class: input.value(Album),
      find: soupyFind.input('album'),
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
