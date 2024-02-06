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

      text:
        html.tag('span',
          language.$('trackList.item.withDuration.duration', {
            duration:
              html.tag('span', {class: 'duration-text'},
                language.$('trackList.item.withDuration.duration.missing')),
          })),

      tooltip:
        relations.tooltip.slots({
          attributes: {class: 'missing-duration-tooltip'},

          content:
            language.$('trackList.item.withDuration.duration.missing.info'),
        }),
    }),
};
