import {empty} from '#sugar';

export default ({
  documentModes: {allInOne},
  thingConstructors: {Motif, MotifSection},
}) => ({
  title: `Process motifs file`,

  file: 'motifs.yaml',

  documentMode: allInOne,
  documentThing: document =>
    ('Section' in document
      ? MotifSection
      : Motif),

  *connect(documents) {
    const motifSections = [];

    let currentMotifSection = new MotifSection();
    let currentMotifSectionMotifs = [];

    Object.assign(currentMotifSection, {
      name: `Motifs`,
      isDefaultMotifSection: true,
    });

    const closeCurrentMotifSection = function*() {
      if (currentMotifSection.isDefaultMotifSection) {
        if (empty(currentMotifSectionMotifs)) {
          return;
        } else {
          yield currentMotifSection;
        }
      }

      currentMotifSection.motifs = currentMotifSectionMotifs;
    };

    for (const document of documents) {
      if (document instanceof MotifSection) {
        yield* closeCurrentMotifSection();

        currentMotifSection = document;
        currentMotifSectionMotifs = [];

        continue;
      }

      currentMotifSectionMotifs.push(document);
      document.motifSection = currentMotifSection;
    }

    yield* closeCurrentMotifSection();
  },

  sort({motifSectionData}) {
    // Dull sort: just move the default motif section up to the top,
    // since yielding it out of connect() doesn't guarantee it any
    // particular placement.

    const defaultSectionIndex =
      motifSectionData.findIndex(s => s.isDefaultMotifSection);

    if (defaultSectionIndex >= 1) {
      const defaultSection = motifSectionData.at(defaultSectionIndex);
      motifSectionData.splice(defaultSectionIndex, 1);
      motifSectionData.unshift(defaultSection);
    }
  },
});
