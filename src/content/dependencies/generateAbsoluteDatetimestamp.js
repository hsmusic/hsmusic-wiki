export default {
  contentDependencies: ['generateDatetimestampTemplate'],
  extraDependencies: ['html', 'language'],

  data: (date) =>
    ({date}),

  relations: (relation) =>
    ({template: relation('generateDatetimestampTemplate')}),

  slots: {
    style: {
      validate: v => v.is('full', 'year'),
      default: 'full',
    },

    // Only has an effect for 'year' style.
    tooltip: {
      type: 'boolean',
      default: false,
    },
  },

  generate: (data, relations, slots, {language}) =>
    relations.template.slots({
      mainContent:
        (slots.style === 'full'
          ? language.formatDate(data.date)
       : slots.style === 'year'
          ? data.date.getFullYear().toString()
          : null),

      tooltipContent:
        slots.tooltip &&
        slots.style === 'year' &&
          language.formatDate(data.date),

      datetime:
        data.date.toISOString(),
    }),
};
