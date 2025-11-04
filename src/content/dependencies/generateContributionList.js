export default {
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

      relations.contributionLinks.length > 1 &&
        {class: 'offset-tooltips'},

      relations.contributionLinks
        .map(contributionLink =>
          html.tag('li',
            contributionLink.slots({
              showAnnotation: true,
              showExternalLinks: true,
              showChronology: true,
              preventWrapping: false,
              chronologyKind: slots.chronologyKind,
            })))),
};
