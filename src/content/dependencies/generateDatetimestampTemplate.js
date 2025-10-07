export default {
  relations: (relation) => ({
    textWithTooltip:
      relation('generateTextWithTooltip'),
  }),

  slots: {
    mainContent: {
      type: 'html',
      mutable: false,
    },

    tooltip: {
      type: 'html',
      mutable: true,
    },

    datetime: {type: 'string'},
  },

  generate: (relations, slots, {html}) =>
    relations.textWithTooltip.slots({
      attributes: {class: 'datetimestamp'},

      text:
        html.tag('time',
          {datetime: slots.datetime},
          slots.mainContent),

      tooltip:
        (html.isBlank(slots.tooltip)
          ? null
          : slots.tooltip.slots({
              attributes: [{class: 'datetimestamp-tooltip'}],
            })),
    }),
};
