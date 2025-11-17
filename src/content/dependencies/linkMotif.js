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

    // PRETEND TO BE A NORMAL INTERNAL LINK. (Evil)
    content: {type: 'string'},
    hash: {type: 'string'},
  },

  generate: (data, relations, slots, {html}) =>
    relations.textWithTooltip.slots({
      requiresTooltipContentFromClient: true,
      customInteractionCue: true,

      text:
        relations.link.slots({
          attributes: {class: 'text-with-tooltip-interaction-cue'},

          // see no evil
          content: slots.content,
          hash: slots.content,
        }),

      tooltip:
        relations.tooltip.slots({
          attributes: {class: 'motif-tooltip'},

          content:
            data.abcNotation &&
            slots.proferTooltip &&
            html.tag('span', {class: 'abc-tip'},
              {'data-notation': JSON.stringify(data.abcNotation)},

              html.tag('span', {class: 'motif-sheet'}),
              html.tag('span', {class: 'motif-control'})),
        }),
    }),
};
