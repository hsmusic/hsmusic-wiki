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
  },

  generate: (relations, slots, {html}) =>
    relations.tooltip.slots({
      attributes:
        {class: ['icons', 'icons-tooltip']},

      contentAttributes:
        {[html.joinChildren]: ''},

      content: [
        slots.showExternalLinks &&
          relations.externalLinkSection,

        slots.showChronology &&
          relations.chronologySection,
      ],
    }),
};
