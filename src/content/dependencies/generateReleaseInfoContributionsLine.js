import {empty} from '#sugar';

export default {
  contentDependencies: ['linkContribution'],
  extraDependencies: ['html', 'language'],

  relations(relation, contributions) {
    if (empty(contributions)) {
      return {};
    }

    return {
      contributionLinks:
        contributions
          .map(contrib => relation('linkContribution', contrib)),
    };
  },

  slots: {
    stringKey: {type: 'string'},

    showContribution: {type: 'boolean', default: true},
    showIcons: {type: 'boolean', default: true},
    showChronology: {type: 'boolean', default: true},
  },

  generate(relations, slots, {html, language}) {
    if (!relations.contributionLinks) {
      return html.blank();
    }

    return language.$(slots.stringKey, {
      artists:
        language.formatConjunctionList(
          relations.contributionLinks.map(link =>
            link.slots({
              showIcons: slots.showIcons,
              showContribution: slots.showContribution,
              showChronology: slots.showChronology,
              iconMode: 'tooltip',
            }))),
    });
  },
};
