export default {
  relations: (relation, contributions) => ({
    contributionLinks:
      contributions
        .map(contrib => relation('linkContribution', contrib)),
  }),

  slots: {
    chronologyKind: {type: 'string'},
  },

  generate: (relations, slots, {html, language}) =>
    html.tag('ul',
      {[html.onlyIfContent]: true},

      relations.contributionLinks.length > 1 &&
      language.$order('misc.artistLink.withContribution', 0) === 'ARTIST' &&
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
