export default {
  extraDependencies: ['html'],

  slots: {
    content: {type: 'html'},

    class: {
      validate: v => v.oneOf(v.isString, v.arrayOf(v.isString)),
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
