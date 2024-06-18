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
    showContribution: {type: 'boolean', default: true},
    showExternalLinks: {type: 'boolean', default: true},
    showChronology: {type: 'boolean', default: true},

    stringKey: {type: 'string'},
    chronologyKind: {type: 'string'},
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
              showContribution: slots.showContribution,
              showExternalLinks: slots.showExternalLinks,
              showChronology: slots.showChronology,
              chronologyKind: slots.chronologyKind,
            }))),
    });
  },
};
