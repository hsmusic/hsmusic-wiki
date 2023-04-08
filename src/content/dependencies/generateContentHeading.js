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
      },

      content(slots) {
        return html.tag('p',
          {
            class: 'content-heading',
            id: slots.id,
            tabindex: '0',
          },
          slots.content);
      },
    });
  }
}
