export default {
  contentDependencies: ['linkContribution'],
  extraDependencies: ['html'],

  relations: (relation, contributions) => ({
    contributionLinks:
      contributions
        .map(contrib => relation('linkContribution', contrib)),
  }),

  generate: (relations, {html}) =>
    html.tag('ul',
      {[html.onlyIfContent]: true},

      relations.contributionLinks
        .map(contributionLink =>
          html.tag('li',
            contributionLink.slots({
              showIcons: true,
              showContribution: true,
              showChronology: true,
              preventWrapping: false,
              iconMode: 'tooltip',
            })))),
};
