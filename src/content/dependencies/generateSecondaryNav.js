export default {
  extraDependencies: ['html'],

  slots: {
    content: {type: 'html'},

    class: {
      validate: v => v.oneOf(v.isString, v.sparseArrayOf(v.isString)),
    },
  },

  generate(slots, {html}) {
    return html.tag('nav', {
      [html.onlyIfContent]: true,
      id: 'secondary-nav',
      class: slots.class,
    }, slots.content);
  },
};
