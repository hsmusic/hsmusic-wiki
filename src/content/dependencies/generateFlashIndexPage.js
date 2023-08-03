export default {
  contentDependencies: ['generatePageLayout'],
  extraDependencies: ['html', 'language'],

  relations(relation) {
    const relations = {};

    relations.layout =
      relation('generatePageLayout');

    return relations;
  },

  generate(relations, {html, language}) {
    return relations.layout.slots({
      title: language.$('flashIndex.title'),

      mainContent: [
        html.tag('p', `Alright alright, this is a stub page! Coming soon!`),
      ],

      navLinkStyle: 'hierarchical',
      navLinks: [
        {auto: 'home'},
        {auto: 'current'},
      ],
    });
  },
};
