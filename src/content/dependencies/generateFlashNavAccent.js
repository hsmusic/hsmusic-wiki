import {empty} from '#sugar';

export default {
  contentDependencies: [
    'generatePreviousNextLinks',
    'linkFlash',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({flashActData}) {
    return {flashActData};
  },

  query(sprawl, flash) {
    // Don't sort chronologically here. The previous/next buttons should match
    // the order in the sidebar, by act rather than date.
    const flashes =
      sprawl.flashActData
        .flatMap(act => act.flashes);

    const index = flashes.indexOf(flash);

    const previousFlash =
      (index > 0
        ? flashes[index - 1]
        : null);

    const nextFlash =
      (index < flashes.length - 1
        ? flashes[index + 1]
        : null);

    return {previousFlash, nextFlash};
  },

  relations(relation, query) {
    const relations = {};

    if (query.previousFlash || query.nextFlash) {
      relations.previousNextLinks =
        relation('generatePreviousNextLinks');

      relations.previousFlashLink =
        (query.previousFlash
          ? relation('linkFlash', query.previousFlash)
          : null);

      relations.nextFlashLink =
        (query.nextFlash
          ? relation('linkFlash', query.nextFlash)
          : null);
    }

    return relations;
  },

  generate(relations, {html, language}) {
    const {content: previousNextLinks = []} =
      relations.previousNextLinks &&
        relations.previousNextLinks.slots({
          previousLink: relations.previousFlashLink,
          nextLink: relations.nextFlashLink,
        });

    const allLinks = [
      ...previousNextLinks,
    ].filter(Boolean);

    if (empty(allLinks)) {
      return html.blank();
    }

    return `(${language.formatUnitList(allLinks)})`;
  },
};
