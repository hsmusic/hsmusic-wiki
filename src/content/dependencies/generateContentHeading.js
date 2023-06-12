export default {
  extraDependencies: ['html'],

  slots: {
    title: {type: 'html'},
    id: {type: 'string'},
    tag: {type: 'string', default: 'p'},
  },

  generate(slots, {html}) {
    return html.tag(slots.tag,
      {
        class: 'content-heading',
        id: slots.id,
        tabindex: '0',
      },
      slots.title);
  }
}
