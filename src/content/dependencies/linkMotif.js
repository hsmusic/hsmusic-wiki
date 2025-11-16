export default {
  relations: (relation, motif) => ({
    link:
      relation('linkThing', 'localized.motifInfo', motif),

    textWithTooltip:
      relation('generateTextWithTooltip'),

    tooltip:
      relation('generateTooltip'),
  }),

  data: (motif) => ({
    abcNotation:
      motif.abcNotation,
  }),

  slots: {
    // tooltip will only actually be shown if abcjs library
    // is loaded for this page
    proferTooltip: {
      type: 'boolean',
      default: true,
    },
  },

  generate: (data, relations, slots, {html}) =>
    relations.textWithTooltip.slots({
      requiresTooltipContentFromClient: true,

      text:
        relations.link.slots({
          attributes: {class: 'text-with-tooltip-interaction-cue'},
        }),

      tooltip:
        relations.tooltip.slots({
          attributes: {class: 'motif-preview-tooltip'},

          content:
            data.abcNotation &&
            slots.proferTooltip &&
            html.tag('div', [
              html.tag('div', {class: 'abc-tip'},
                {'data-notation': JSON.stringify(data.abcNotation)},

                [
                  html.tag('div', {class: 'motif-sheet'}),
                  html.tag('div', {class: 'motif-control'}),
                ]),
            ]),
        }),
    }),
};
