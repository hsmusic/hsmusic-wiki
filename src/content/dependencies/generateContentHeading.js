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

  generate: (relations, slots, {html}) =>
    html.tag(slots.tag, {class: 'content-heading'},
      {id: slots.id},
      {tabindex: '0'},

      slots.color &&
        {style:
          relations.colorVariables
            .slot('color', slots.color)
            .content},

      [
        html.tag('span', {class: 'content-heading-main-title'},
          {[html.onlyIfContent]: true},
          slots.title),

        html.tag('span', {class: 'content-heading-accent'},
          {[html.onlyIfContent]: true},
          slots.accent),
      ]),
}
