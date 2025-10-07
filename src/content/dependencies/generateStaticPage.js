export default {
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

        styleTags: [
          html.tag('style', {class: 'static-page-style'},
            {[html.onlyIfContent]: true},
            data.stylesheet),
        ],

        mainClasses: ['long-content'],
        mainContent: [
          relations.content,

          html.tag('script',
            {[html.onlyIfContent]: true},
            data.script),
        ],

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},
          {auto: 'current'},
        ],
      });
  },
};
