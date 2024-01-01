export default {
  extraDependencies: ['html'],

  slots: {
    mainContent: {
      type: 'html',
      mutable: false,
    },

    tooltipContent: {
      type: 'html',
      mutable: false,
    },

    datetime: {type: 'string'},
  },

  generate: (slots, {html}) =>
    html.tag('span', {class: 'datetimestamp'},
      {[html.joinChildren]: ''},

      slots.tooltipContent &&
        {class: 'has-tooltip'},

      [
        html.tag('time',
          {datetime: slots.datetime},
          slots.mainContent),

        slots.tooltipContent &&
          html.tag('span', {class: 'datetimestamp-tooltip'},
            html.tag('span', {class: 'datetimestamp-tooltip-content'},
              slots.tooltipContent)),
      ]),
};
