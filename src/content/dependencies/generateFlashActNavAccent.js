export default {
  relations: (relation, flashAct) => ({
    switcher:
      relation('generateInterpageDotSwitcher'),

    previousLink:
      relation('generatePreviousLink'),

    nextLink:
      relation('generateNextLink'),

    previousFlashActLink:
      (flashAct.previousAct
        ? relation('linkFlashAct', flashAct.previousAct)
        : null),

    nextFlashActLink:
      (flashAct.nextAct
        ? relation('linkFlashAct', flashAct.nextAct)
        : null),
  }),

  generate: (relations) =>
    relations.switcher.slots({
      links: [
        relations.previousLink
          .slot('link', relations.previousFlashActLink),

        relations.nextLink
          .slot('link', relations.nextFlashActLink),
      ],
    }),
};
