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

  generate(slots, {html, language}) {
    const capsule =
      language.encapsulate('releaseInfo.additionalFiles.entry');

    const summary =
      html.tag('summary',
        html.tag('span',
          language.$(capsule, {
            title:
              html.tag('span', {class: 'group-name'},
                slots.title),
          })));

    const description =
      html.tag('li', {class: 'entry-description'},
        {[html.onlyIfContent]: true},
        slots.description);

    const items =
      (html.isBlank(slots.items)
        ? html.tag('li',
            language.$(capsule, 'noFilesAvailable'))
        : slots.items);

    const content =
      html.tag('ul', [description, items]);

    const details =
      html.tag('details',
        html.isBlank(slots.items) &&
          {open: true},

        [summary, content]);

    return html.tag('li', details);
  },
};
