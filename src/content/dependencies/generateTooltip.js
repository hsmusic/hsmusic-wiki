export default {
  slots: {
    attributes: {
      type: 'attributes',
      mutable: false,
    },

    separateContentItems: {
      type: 'boolean',
      default: false,
    },

    // Just be an array (of HTML). We'll be embedding this right as the content
    // of an inner span where we might be applying [html.joinChildren], so we
    // can't have it wrapped as its own self-entire html.tags().
    content: {
      validate: v => v.looseArrayOf(v.isHTML),
    },
  },

  generate: (slots, {html}) =>
    html.tag('span', {class: 'tooltip'},
      {[html.noEdgeWhitespace]: true},
      {[html.onlyIfContent]: true},
      {[html.onlyIfSiblings]: true},
      slots.attributes,

      html.tag('span', {class: 'tooltip-content'},
        {[html.noEdgeWhitespace]: true},
        {[html.onlyIfContent]: true},

        slots.separateContentItems &&
          {[html.joinChildren]: html.tag('span', {class: 'tooltip-divider'})},

        slots.content)),
};
