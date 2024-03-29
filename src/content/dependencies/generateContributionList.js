export default {
  contentDependencies: ['linkContribution'],
  extraDependencies: ['html'],

  relations: (relation, contributions) =>
    ({contributionLinks:
        contributions
          .map(contrib => relation('linkContribution', contrib))}),

  generate: (relations, {html}) =>
    html.tag('ul',
      relations.contributionLinks.map(contributionLink =>
        html.tag('li',
          contributionLink
            .slots({
              showIcons: true,
              showContribution: true,
              preventWrapping: false,
              iconMode: 'tooltip',
            })))),
};
