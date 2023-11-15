export default {
  extraDependencies: ['html'],
  contentDependencies: ['generateColorStyleVariables'],

  relations: (relation) => ({
    colorVariables: relation('generateColorStyleVariables'),
  }),

  slots: {
    title: {type: 'html'},
    accent: {type: 'html'},

    color: {validate: v => v.isColor},

    id: {type: 'string'},
    tag: {type: 'string', default: 'p'},
  },

  generate(relations, slots, {html}) {
    return html.tag(slots.tag,
      {
        class: 'content-heading',
        id: slots.id,
        tabindex: '0',

        style:
          slots.color &&
            relations.colorVariables
              .slot('color', slots.color)
              .content,
      }, [
        slots.title,

        html.tag('span',
          {[html.onlyIfContent]: true, class: 'content-heading-accent'},
          slots.accent),
      ]);
  }
}
