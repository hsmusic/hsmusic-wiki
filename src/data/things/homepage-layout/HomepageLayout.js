const HOMEPAGE_LAYOUT_DATA_FILE = 'homepage.yaml';

import {V} from '#composite';
import Thing from '#thing';
import {empty} from '#sugar';
import {isStringNonEmpty, validateArrayItems} from '#validators';

import {exposeConstant} from '#composite/control-flow';
import {contentString, thingList} from '#composite/wiki-properties';

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

    sections: thingList(V(HomepageLayoutSection)),

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
      HomepageLayoutActionsRow,
      HomepageLayoutAlbumCarouselRow,
      HomepageLayoutAlbumGridRow,
      HomepageLayoutRow,
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
