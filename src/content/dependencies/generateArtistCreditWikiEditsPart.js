export default {
  contentDependencies: [
    'generateTextWithTooltip',
    'generateTooltip',
    'linkContribution',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, contributions) => ({
    textWithTooltip:
      relation('generateTextWithTooltip'),

    tooltip:
      relation('generateTooltip'),

    contributionLinks:
      contributions
        .map(contrib => relation('linkContribution', contrib)),
  }),

  slots: {
    showAnnotation: {type: 'boolean', default: true},
  },

  generate: (relations, slots, {language}) =>
    language.encapsulate('misc.artistLink.withEditsForWiki', capsule =>
      relations.textWithTooltip.slots({
        attributes:
          {class: 'wiki-edits'},

        text:
          language.$(capsule, 'edits'),

        tooltip:
          relations.tooltip.slots({
            attributes:
              {class: 'wiki-edits-tooltip'},

            content:
              language.$(capsule, 'editsLine', {
                [language.onlyIfOptions]: ['artists'],

                artists:
                  language.formatConjunctionList(
                    relations.contributionLinks.map(link =>
                      link.slots({
                        showAnnotation: slots.showAnnotation,
                        trimAnnotation: true,
                        preventTooltip: true,
                      }))),
                }),
          }),
      })),
};
