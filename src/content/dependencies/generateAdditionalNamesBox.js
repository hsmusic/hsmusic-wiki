export default {
  relations: (relation, additionalNames) => ({
    items:
      additionalNames
        .map(entry => relation('generateAdditionalNamesBoxItem', entry)),
  }),

  slots: {
    alwaysVisible: {
      type: 'boolean',
      default: false,
    },
  },

  generate: (relations, slots, {html, language}) =>
    html.tag('div', {id: 'additional-names-box'},
      {class: 'drop'},
      {[html.onlyIfContent]: true},

      slots.alwaysVisible &&
        {class: 'always-visible'},

      [
        html.tag('p',
          {[html.onlyIfSiblings]: true},

          language.$('misc.additionalNames.title')),

        html.tag('ul',
          {[html.onlyIfContent]: true},

          relations.items
            .map(item => html.tag('li', item))),
      ]),
};
