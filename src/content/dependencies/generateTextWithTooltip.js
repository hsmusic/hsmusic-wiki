export default {
  extraDependencies: ['html'],

  slots: {
    attributes: {
      type: 'attributes',
      mutable: false,
    },

    customInteractionCue: {
      type: 'boolean',
      default: false,
    },

    text: {
      type: 'html',
      mutable: false,
    },

    tooltip: {
      type: 'html',
      mutable: false,
    },
  },

  generate(slots, {html}) {
    const hasTooltip =
      !html.isBlank(slots.tooltip);

    if (slots.attributes.blank && !hasTooltip) {
      return slots.text;
    }

    let {attributes} = slots;

    if (hasTooltip) {
      attributes = attributes.clone();
      attributes.add({
        [html.onlyIfContent]: true,
        [html.joinChildren]: '',
        [html.noEdgeWhitespace]: true,
        class: 'text-with-tooltip',
      });
    }

    const textPart =
      (hasTooltip && slots.customInteractionCue
        ? html.tag('span', {class: 'hoverable'},
            slots.text)
     : hasTooltip
        ? html.tag('span', {class: 'hoverable'},
            html.tag('span', {class: 'text-with-tooltip-interaction-cue'},
              slots.text))
        : slots.text);

    const content =
      (hasTooltip
        ? [textPart, slots.tooltip]
        : textPart);

    return html.tag('span', attributes, content);
  },
};
