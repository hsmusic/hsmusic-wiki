export default {
  relations: (relation) => ({
    textWithTooltip:
      relation('generateTextWithTooltip'),

    tooltip:
      relation('generateTooltip'),
  }),

  generate: (relations, {html, language}) =>
    language.encapsulate('trackList.item.accent.duration', capsule =>
      relations.textWithTooltip.slots({
        attributes: {class: 'missing-duration'},
        customInteractionCue: true,

        text:
          language.$(capsule, {
            duration:
              html.tag('span', {class: 'text-with-tooltip-interaction-cue'},
                {tabindex: '0'},

                language.$(capsule, 'missing')),
          }),

        tooltip:
          relations.tooltip.slots({
            attributes: {class: 'missing-duration-tooltip'},

            content:
              language.$(capsule, 'missing.info'),
          }),
      })),
};
