export default {
  relations: (relation, contributions, formatText) => ({
    contributionLinks:
      contributions
        .map(contrib => relation('linkContribution', contrib)),

    formatText:
      relation('transformContent', formatText),
  }),

  slots: {
    attributes: {type: 'attributes', mutable: false},
    title: {type: 'html', mutable: false},

    chronologyKind: {type: 'string'},
  },

  generate(relations, slots, {html, language}) {
    const {contributionLinks} = relations;

    for (const link of contributionLinks) {
      link.setSlots({
        showAnnotation: true,
        showExternalLinks: true,
        showChronology: true,
        preventWrapping: false,
        chronologyKind: slots.chronologyKind,
      });
    }

    if (!html.isBlank(relations.formatText)) {
      return (
        html.tag('div',
          slots.attributes,
          relations.formatText.slot('mode', 'contributors'))
      );
    }

    return html.tags([
      html.tag('p',
        {[html.onlyIfSiblings]: true},
        slots.attributes,
        slots.title),

      html.tag('ul',
        {[html.onlyIfContent]: true},

        relations.contributionLinks.length > 1 &&
        language.$order('misc.artistLink.withContribution', 0) === 'ARTIST' &&
          {class: 'offset-tooltips'},

        contributionLinks
          .map(link => html.tag('li', link)))
    ]);
  }
};
