import {atOffset} from '#sugar';

export default {
  contentDependencies: [
    'generateInterpageDotSwitcher',
    'generateNextLink',
    'generatePreviousLink',
    'linkFlashAct',
  ],

  extraDependencies: ['wikiData'],

  sprawl: ({flashActData}) =>
    ({flashActData}),

  query(sprawl, flashAct) {
    // Like with generateFlashNavAccent, don't sort chronologically here.
    const flashActs =
      sprawl.flashActData;

    const index =
      flashActs.indexOf(flashAct);

    const previousFlashAct =
      atOffset(flashActs, index, -1);

    const nextFlashAct =
      atOffset(flashActs, index, +1);

    return {previousFlashAct, nextFlashAct};
  },

  relations: (relation, query) => ({
    switcher:
      relation('generateInterpageDotSwitcher'),

    previousLink:
      relation('generatePreviousLink'),

    nextLink:
      relation('generateNextLink'),

    previousFlashActLink:
      (query.previousFlashAct
        ? relation('linkFlashAct', query.previousFlashAct)
        : null),

    nextFlashActLink:
      (query.nextFlashAct
        ? relation('linkFlashAct', query.nextFlashAct)
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
