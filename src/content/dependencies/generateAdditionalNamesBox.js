export default {
  contentDependencies: ['generateAdditionalNamesBoxItem'],
  extraDependencies: ['html', 'language'],

  relations: (relation, additionalNames) => ({
    items:
      additionalNames
        .map(entry => relation('generateAdditionalNamesBoxItem', entry)),
  }),

  generate: (relations, {html, language}) =>
    html.tag('div', {id: 'additional-names-box'}, [
      html.tag('p',
        language.$('misc.additionalNames.title')),

      html.tag('ul',
        relations.items
          .map(item => html.tag('li', item))),
    ]),
};
