export default {
  extraDependencies: ['html'],

  slots: {
    mainContent: {type: 'html'},
    tooltipContent: {type: 'html'},
    datetime: {type: 'string'},
  },

  generate: (slots, {html}) =>
    html.tag('span', {
      [html.joinChildren]: '',

      class: [
        'datetimestamp',
        slots.tooltipContent && 'has-tooltip',
      ],
    }, [
      html.tag('time',
        {datetime: slots.datetime},
        slots.mainContent),

      slots.tooltipContent &&
        html.tag('span', {class: 'datetimestamp-tooltip'},
          html.tag('span', {class: 'datetimestamp-tooltip-content'},
            slots.tooltipContent)),
    ]),
};
