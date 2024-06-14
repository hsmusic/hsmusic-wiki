export default {
  extraDependencies: ['html', 'language'],

  slots: {
    title: {
      type: 'html',
      mutable: false,
    },

    description: {
      type: 'html',
      mutable: false,
    },

    items: {
      validate: v => v.looseArrayOf(v.isHTML),
    },
  },

  generate: (slots, {html, language}) =>
    language.encapsulate('releaseInfo.additionalFiles.entry', capsule =>
      html.tag('li',
        html.tag('details',
          html.isBlank(slots.items) &&
            {open: true},

          [
            html.tag('summary',
              html.tag('span',
                language.$(capsule, {
                  title:
                    html.tag('span', {class: 'group-name'},
                      slots.title),
                }))),

            html.tag('ul', [
              html.tag('li', {class: 'entry-description'},
                {[html.onlyIfContent]: true},
                slots.description),

              (html.isBlank(slots.items)
                ? html.tag('li',
                    language.$(capsule, 'noFilesAvailable'))
                : slots.items),
            ]),
          ]))),
};
