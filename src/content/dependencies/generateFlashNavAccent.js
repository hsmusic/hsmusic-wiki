import {empty} from '../../util/sugar.js';
import {sortFlashesChronologically} from '../../util/wiki-data.js';

export default {
  contentDependencies: [
    'generatePreviousNextLinks',
    'linkFlash',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({flashData}) {
    return {flashData};
  },

  query(sprawl, flash) {
    const flashes =
      sortFlashesChronologically(sprawl.flashData.slice());

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

  slots: {
    showFlashNavigation: {type: 'boolean', default: false},
  },

  generate(relations, slots, {html, language}) {
    const {content: previousNextLinks = []} =
      slots.showFlashNavigation &&
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
