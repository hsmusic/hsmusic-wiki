export default {
  contentDependencies: ['generateTextWithTooltip', 'generateTooltip'],
  extraDependencies: ['html', 'language'],

  relations: (relation) => ({
    textWithTooltip:
      relation('generateTextWithTooltip'),

    tooltip:
      relation('generateTooltip'),
  }),

  generate: (relations, {html, language}) =>
    relations.textWithTooltip.slots({
      attributes: {class: 'missing-duration'},
      customInteractionCue: true,

      text:
        language.$('trackList.item.withDuration.duration', {
          duration:
            html.tag('span', {class: 'text-with-tooltip-interaction-cue'},
              language.$('trackList.item.withDuration.duration.missing')),
        }),

      tooltip:
        relations.tooltip.slots({
          attributes: {class: 'missing-duration-tooltip'},

          content:
            language.$('trackList.item.withDuration.duration.missing.info'),
        }),
    }),
};
