export default {
  relations: (relation, _thing) => ({
    contentHeading:
      relation('generateContentHeading'),
  }),

  data: (thing) => ({
    name:
      (thing ? thing.name : null),

    nameStyle:
      (thing ? thing.nameStyle : null),
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
        language.encapsulate(slots.string, workingCapsule => {
          if (!slots.string) return html.blank();

          const workingOptions = {};

          if (slots.summary) {
            workingOptions.cue =
              html.tag('span', {class: 'cue'},
                language.$(slots.string, 'cue'));
          }

          const name =
            (data.nameStyle === 'utility' ||
             data.nameStyle === 'unofficial' ||
             data.nameStyle === 'unofficial localization'
              ? null
              : data.name);

          if (name) {
            workingOptions.thing = html.tag('i', name);
          } else {
            workingCapsule += '.withoutName';
          }

          if (slots.summary) {
            return html.tags([
              html.tag('span', {class: 'when-open'},
                language.$(workingCapsule, workingOptions)),

              html.tag('span', {class: 'when-collapsed'},
                language.$(workingCapsule, 'collapsed', workingOptions)),
            ]);
          } else {
            return language.$(workingCapsule, workingOptions);
          }
        }),

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
