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
    language.encapsulate('trackList.item.withDuration', itemCapsule =>
      language.encapsulate(itemCapsule, 'duration', durationCapsule =>
        relations.textWithTooltip.slots({
          attributes: {class: 'missing-duration'},
          customInteractionCue: true,

          text:
            language.$(durationCapsule, {
              duration:
                html.tag('span', {class: 'text-with-tooltip-interaction-cue'},
                  language.$(durationCapsule, 'missing')),
            }),

          tooltip:
            relations.tooltip.slots({
              attributes: {class: 'missing-duration-tooltip'},

              content:
                language.$(durationCapsule, 'missing.info'),
            }),
        }))),
};
