export default {
  relations: (relation, flash) => ({
    switcher:
      relation('generateInterpageDotSwitcher'),

    previousLink:
      relation('generatePreviousLink'),

    nextLink:
      relation('generateNextLink'),

    previousFlashLink:
      (flash.previousFlash
        ? relation('linkFlash', flash.previousFlash)
        : null),

    nextFlashLink:
      (flash.nextFlash
        ? relation('linkFlash', flash.nextFlash)
        : null),
  }),

  generate: (relations) =>
    relations.switcher.slots({
      links: [
        relations.previousLink
          .slot('link', relations.previousFlashLink),

        relations.nextLink
          .slot('link', relations.nextFlashLink),
      ],
    }),
};
