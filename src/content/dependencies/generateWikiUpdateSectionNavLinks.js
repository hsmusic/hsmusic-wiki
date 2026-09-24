export default {
  relations: (relation, section) => ({
    switcher:
      relation('generateInterpageDotSwitcher'),

    previousLink:
      relation('generatePreviousLink'),

    nextLink:
      relation('generateNextLink'),

    previousSectionLink:
      (section.previousSection
        ? relation('linkWikiUpdateSectionPage', section.previousSection)
        : null),

    nextSectionLink:
      (section.nextSection
        ? relation('linkWikiUpdateSectionPage', section.nextSection)
        : null),
  }),

  generate: (relations) =>
    relations.switcher.slots({
      links: [
        relations.previousLink
          .slot('link', relations.previousSectionLink),

        relations.nextLink
          .slot('link', relations.nextSectionLink),
      ],
    }),
};
