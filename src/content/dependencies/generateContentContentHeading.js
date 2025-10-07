export default {
  relations: (relation, _thing) => ({
    contentHeading:
      relation('generateContentHeading'),
  }),

  data: (thing) => ({
    name:
      (thing
        ? thing.name
        : null),
  }),

  slots: {
    attributes: {
      type: 'attributes',
      mutable: false,
    },

    string: {
      type: 'string',
    },

    summary: {
      type: 'boolean',
      default: false,
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    relations.contentHeading.slots({
      attributes: slots.attributes,

      title:
        (() => {
          if (!slots.string) return html.blank();

          const options = {};

          if (slots.summary) {
            options.cue =
              html.tag('span', {class: 'cue'},
                language.$(slots.string, 'cue'));
          }

          if (data.name) {
            options.thing = html.tag('i', data.name);
          }

          if (slots.summary) {
            return html.tags([
              html.tag('span', {class: 'when-open'},
                language.$(slots.string, options)),

              html.tag('span', {class: 'when-collapsed'},
                language.$(slots.string, 'collapsed', options)),
            ]);
          } else {
            return language.$(slots.string, options);
          }
        })(),

      stickyTitle:
        (slots.string
          ? language.$(slots.string, 'sticky')
          : html.blank()),

      tag:
        (slots.summary
          ? 'summary'
          : 'p'),
    }),
};
