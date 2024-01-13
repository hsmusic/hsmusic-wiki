export default {
  extraDependencies: ['html'],

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

  generate: (slots, {html}) =>
    html.tag('span', {class: 'datetimestamp'},
      {[html.joinChildren]: ''},

      !html.isBlank(slots.tooltip) &&
        {class: 'has-tooltip'},

      [
        html.tag('time',
          {datetime: slots.datetime},
          slots.mainContent),

        slots.tooltip?.slots({
          attributes: [{class: 'datetimestamp-tooltip'}],
        }),
      ]),
};
