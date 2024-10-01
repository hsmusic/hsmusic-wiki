export default {
  contentDependencies: ['generateAdditionalNamesBoxItem'],
  extraDependencies: ['html', 'language'],

  relations: (relation, additionalNames) => ({
    items:
      additionalNames
        .map(entry => relation('generateAdditionalNamesBoxItem', entry)),
  }),

  generate: (relations, {html, language}) =>
    html.tag('div', {id: 'additional-names-box'},
      {[html.onlyIfContent]: true},

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
