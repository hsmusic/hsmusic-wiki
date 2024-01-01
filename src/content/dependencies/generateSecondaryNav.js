export default {
  extraDependencies: ['html'],

  slots: {
    content: {
      type: 'html',
      mutable: false,
    },

    class: {
      validate: v => v.oneOf(v.isString, v.sparseArrayOf(v.isString)),
    },
  },

  generate: (slots, {html}) =>
    html.tag('nav', {id: 'secondary-nav'},
      {[html.onlyIfContent]: true},
      {class: slots.class},
      slots.content),
};
