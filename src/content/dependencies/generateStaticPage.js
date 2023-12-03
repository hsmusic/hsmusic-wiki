export default {
  contentDependencies: ['generatePageLayout', 'transformContent'],
  extraDependencies: ['html'],

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
      script: staticPage.script,
    };
  },

  generate(data, relations, {html}) {
    return relations.layout
      .slots({
        title: data.name,
        headingMode: 'sticky',

        styleRules:
          (data.stylesheet
            ? [data.stylesheet]
            : []),

        mainClasses: ['long-content'],
        mainContent: [
          relations.content,

          data.script &&
            html.tag('script', data.script),
        ],

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},
          {auto: 'current'},
        ],
      });
  },
};
