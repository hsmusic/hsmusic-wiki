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

  generate: (relations, {html, language}) =>
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
              html.tags(
                relations.contributionLinks.map(link =>
                  language.$(capsule, 'editsLine', {
                    artist:
                      link.slots({
                        showAnnotation: true,
                        trimAnnotation: true,
                        preventTooltip: true,
                      }),
                  })),

                {[html.joinChildren]: html.tag('br')}),
          }),
      })),
};
