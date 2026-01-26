import {empty} from '#sugar';

export default ({
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
  file: 'homepage.yaml',

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
