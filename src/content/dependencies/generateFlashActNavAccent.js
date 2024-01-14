import {atOffset, empty} from '#sugar';

export default {
  contentDependencies: [
    'generatePreviousNextLinks',
    'linkFlashAct',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({flashActData}) {
    return {flashActData};
  },

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

  relations(relation, query) {
    const relations = {};

    if (query.previousFlashAct || query.nextFlashAct) {
      relations.previousNextLinks =
        relation('generatePreviousNextLinks');

      relations.previousFlashActLink =
        (query.previousFlashAct
          ? relation('linkFlashAct', query.previousFlashAct)
          : null);

      relations.nextFlashActLink =
        (query.nextFlashAct
          ? relation('linkFlashAct', query.nextFlashAct)
          : null);
    }

    return relations;
  },

  generate(relations, {html, language}) {
    const {content: previousNextLinks = []} =
      relations.previousNextLinks &&
        relations.previousNextLinks.slots({
          previousLink: relations.previousFlashActLink,
          nextLink: relations.nextFlashActLink,
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
