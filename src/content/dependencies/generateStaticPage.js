export default {
  contentDependencies: ['generatePageLayout', 'transformContent'],

  relations(relation, staticPage) {
    return {
      layout: relation('generatePageLayout'),
      content: relation('transformContent', staticPage.content),
    };
  },

  data(staticPage) {
    return {
      name: staticPage.name,
      stylesheet: staticPage.stylesheet,
    };
  },

  generate(data, relations) {
    return relations.layout
      .slots({
        title: data.name,
        headingMode: 'sticky',

        styleRules:
          (data.stylesheet
            ? [data.stylesheet]
            : []),

        mainClasses: ['long-content'],
        mainContent: relations.content,

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},
          {auto: 'current'},
        ],
      });
  },
};
