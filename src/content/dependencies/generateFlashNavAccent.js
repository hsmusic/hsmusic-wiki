import {atOffset} from '#sugar';

export default {
  contentDependencies: [
    'generateNavAccent',
    'generateNextLink',
    'generatePreviousLink',
    'linkFlash',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({flashActData}) =>
    ({flashActData}),

  query(sprawl, flash) {
    // Don't sort chronologically here. The previous/next buttons should match
    // the order in the sidebar, by act rather than date.
    const flashes =
      sprawl.flashActData
        .flatMap(act => act.flashes);

    const index =
      flashes.indexOf(flash);

    const previousFlash =
      atOffset(flashes, index, -1);

    const nextFlash =
      atOffset(flashes, index, +1);

    return {previousFlash, nextFlash};
  },

  relations: (relation, query) => ({
    navAccent:
      relation('generateNavAccent'),

    previousLink:
      relation('generatePreviousLink'),

    nextLink:
      relation('generateNextLink'),

    previousFlashLink:
      (query.previousFlash
        ? relation('linkFlash', query.previousFlash)
        : null),

    nextFlashLink:
      (query.nextFlash
        ? relation('linkFlash', query.nextFlash)
        : null),
  }),

  generate(relations) {
    const previousLink =
      relations.previousLink.slot('link', relations.previousFlashLink);

    const nextLink =
      relations.nextLink.slot('link', relations.nextFlashLink);

    return relations.navAccent.slots({
      attributes: {class: 'page-nav-links'},

      links: [
        previousLink,
        nextLink,
      ],
    });
  },
};
