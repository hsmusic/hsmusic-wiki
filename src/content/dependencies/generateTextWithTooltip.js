export default {
  extraDependencies: ['html'],

  slots: {
    attributes: {
      type: 'attributes',
      mutable: false,
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
        [html.joinChildren]: '',
        [html.noEdgeWhitespace]: true,
        class: 'text-with-tooltip',
      });
    }

    const content =
      (hasTooltip
        ? [slots.text, slots.tooltip]
        : slots.text);

    return html.tag('span', attributes, content);
  },
};
