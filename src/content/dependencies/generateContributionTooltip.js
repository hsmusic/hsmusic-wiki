export default {
  contentDependencies: [
    'generateContributionTooltipChronologySection',
    'generateContributionTooltipExternalLinkSection',
    'generateTooltip',
  ],

  extraDependencies: ['html'],

  relations: (relation, contribution) => ({
    tooltip:
      relation('generateTooltip'),

    externalLinkSection:
      relation('generateContributionTooltipExternalLinkSection', contribution),

    chronologySection:
      relation('generateContributionTooltipChronologySection', contribution),
  }),

  slots: {
    showExternalLinks: {type: 'boolean'},
    showChronology: {type: 'boolean'},

    chronologyKind: {type: 'string'},
  },

  generate: (relations, slots, {html}) =>
    relations.tooltip.slots({
      attributes:
        {class: 'contribution-tooltip'},

      contentAttributes: {
        [html.joinChildren]:
          html.tag('span', {class: 'tooltip-divider'}),
      },

      content: [
        slots.showExternalLinks &&
          relations.externalLinkSection,

        slots.showChronology &&
          relations.chronologySection.slots({
            kind: slots.chronologyKind,
          }),
      ],
    }),
};
