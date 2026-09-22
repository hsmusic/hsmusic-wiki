export default {
  relations: (relation, update) => ({
    switcher:
      relation('generateInterpageDotSwitcher'),

    previousLink:
      relation('generatePreviousLink'),

    nextLink:
      relation('generateNextLink'),

    previousUpdateLink:
      (update.previousMainUpdate
        ? relation('linkWikiUpdate', update.previousMainUpdate)
        : null),

    nextUpdateLink:
      (update.nextMainUpdate
        ? relation('linkWikiUpdate', update.nextMainUpdate)
        : null),
  }),

  generate: (relations) =>
    relations.switcher.slots({
      links: [
        relations.previousLink
          .slot('link', relations.previousUpdateLink),

        relations.nextLink
          .slot('link', relations.nextUpdateLink),
      ],
    }),
};
