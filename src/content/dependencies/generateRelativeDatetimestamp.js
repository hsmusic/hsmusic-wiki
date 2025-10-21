export default {
  data: (currentDate, referenceDate) =>
    (currentDate.getTime() === referenceDate.getTime()
      ? {equal: true, date: currentDate}
      : {equal: false, currentDate, referenceDate}),

  relations: (relation, currentDate) => ({
    template:
      relation('generateDatetimestampTemplate'),

    fallback:
      relation('generateAbsoluteDatetimestamp', currentDate),

    tooltip:
      relation('generateTooltip'),
  }),

  slots: {
    style: {
      validate: v => v.is('full', 'year'),
      default: 'full',
    },
  },

  generate(data, relations, slots, {language}) {
    if (data.equal) {
      return relations.fallback.slot('style', slots.style);
    }

    return relations.template.slots({
      mainContent:
        (slots.style === 'full'
          ? language.formatDate(data.currentDate)
       : slots.style === 'year'
          ? data.currentDate.getFullYear().toString()
          : null),

      tooltip:
        relations.tooltip.slots({
          content:
            language.formatRelativeDate(data.currentDate, data.referenceDate, {
              considerRoundingDays: true,
              approximate: true,
              absolute: slots.style === 'year',
            }),
        }),

      datetime:
        data.currentDate.toISOString(),
    });
  },
};
