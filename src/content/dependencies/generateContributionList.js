export default {
  contentDependencies: ['linkContribution'],
  extraDependencies: ['html'],

  relations: (relation, contributions) => ({
    contributionLinks:
      contributions
        .map(contrib => relation('linkContribution', contrib)),
  }),

  slots: {
    chronologyKind: {type: 'string'},
  },

  generate: (relations, slots, {html}) =>
    html.tag('ul',
      {[html.onlyIfContent]: true},

      relations.contributionLinks
        .map(contributionLink =>
          html.tag('li',
            contributionLink.slots({
              showExternalLinks: true,
              showContribution: true,
              showChronology: true,
              preventWrapping: false,
              chronologyKind: slots.chronologyKind,
            })))),
};
