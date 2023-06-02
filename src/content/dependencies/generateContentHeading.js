export default {
  extraDependencies: [
    'html',
  ],

  generate({html}) {
    return html.template({
      annotation: 'generateContentHeading',

      slots: {
        title: {type: 'html'},
        id: {type: 'string'},
        tag: {type: 'string', default: 'p'},
      },

      content(slots) {
        return html.tag(slots.tag,
          {
            class: 'content-heading',
            id: slots.id,
            tabindex: '0',
          },
          slots.title);
      },
    });
  }
}
