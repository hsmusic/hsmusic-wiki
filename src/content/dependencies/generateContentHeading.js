export default {
  extraDependencies: ['html'],
  contentDependencies: ['generateColorStyleAttribute'],

  relations: (relation) => ({
    colorStyle: relation('generateColorStyleAttribute'),
  }),

  slots: {
    title: {
      type: 'html',
      mutable: false,
    },

    stickyTitle: {
      type: 'html',
      mutable: false,
    },

    accent: {
      type: 'html',
      mutable: false,
    },

    attributes: {
      type: 'attributes',
      mutable: false,
    },

    color: {validate: v => v.isColor},

    tag: {
      type: 'string',
      default: 'p',
    },
  },

  generate: (relations, slots, {html}) =>
    html.tag(slots.tag, {class: 'content-heading'},
      {tabindex: '0'},
      {[html.onlyIfSiblings]: true},

      slots.attributes,

      slots.color &&
        relations.colorStyle.slot('color', slots.color),

      [
        html.tag('span', {class: 'content-heading-main-title'},
          {[html.onlyIfContent]: true},
          slots.title),

        html.tag('template', {class: 'content-heading-sticky-title'},
          {[html.onlyIfContent]: true},
          slots.stickyTitle),

        html.tag('span', {class: 'content-heading-accent'},
          {[html.onlyIfContent]: true},
          slots.accent),
      ]),
}
