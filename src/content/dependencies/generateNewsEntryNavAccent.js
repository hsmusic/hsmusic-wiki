export default {
  contentDependencies: [
    'generateInterpageDotSwitcher',
    'generateNextLink',
    'generatePreviousLink',
    'linkNewsEntry',
  ],

  relations: (relation, previousEntry, nextEntry) => ({
    switcher:
      relation('generateInterpageDotSwitcher'),

    previousLink:
      relation('generatePreviousLink'),

    nextLink:
      relation('generateNextLink'),

    previousEntryLink:
      (previousEntry
        ? relation('linkNewsEntry', previousEntry)
        : null),

    nextEntryLink:
      (nextEntry
        ? relation('linkNewsEntry', nextEntry)
        : null),
  }),

  generate: (relations) =>
    relations.switcher.slots({
      links: [
        relations.previousLink
          .slot('link', relations.previousEntryLink),

        relations.nextLink
          .slot('link', relations.nextEntryLink),
      ],
    }),
};
