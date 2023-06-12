import {empty} from '../../util/sugar.js';

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
          .slice(0, 4)
          .map(({who, what}) =>
            relation('linkContribution', who, what)),
    };
  },

  generate(relations, {html, language}) {
    return html.template({
      annotation: `generateReleaseInfoContributionsLine`,

      slots: {
        stringKey: {type: 'string'},

        showContribution: {type: 'boolean', default: true},
        showIcons: {type: 'boolean', default: true},
      },

      content(slots) {
        if (!relations.contributionLinks) {
          return html.blank();
        }

        return language.$(slots.stringKey, {
          artists:
            language.formatConjunctionList(
              relations.contributionLinks.map(link =>
                link.slots({
                  showContribution: slots.showContribution,
                  showIcons: slots.showIcons,
                }))),
        });
      },
    });
  },
};
