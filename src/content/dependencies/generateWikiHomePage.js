export default {
  contentDependencies: [
    'generatePageLayout',
    'generateWikiHomeNewsBox',
    'transformContent',
  ],

  extraDependencies: ['wikiData'],

  sprawl({wikiInfo}) {
    return {
      wikiName: wikiInfo.name,

      enableNews: wikiInfo.enableNews,
    };
  },

  relations(relation, sprawl, homepageLayout) {
    const relations = {};

    relations.layout =
      relation('generatePageLayout');

    if (homepageLayout.sidebarContent) {
      relations.customSidebarContent =
        relation('transformContent', homepageLayout.sidebarContent);
    }

    if (sprawl.enableNews) {
      relations.newsSidebarBox =
        relation('generateWikiHomeNewsBox');
    }

    if (homepageLayout.navbarLinks) {
      relations.customNavLinkContents =
        homepageLayout.navbarLinks
          .map(content => relation('transformContent', content));
    }

    return relations;
  },

  data(sprawl) {
    return {
      wikiName: sprawl.wikiName,
    };
  },

  generate(data, relations) {
    return relations.layout.slots({
      title: data.wikiName,
      showWikiNameInTitle: false,

      mainClasses: ['top-index'],
      headingMode: 'static',

      mainContent: [],

      leftSidebarCollapse: false,
      leftSidebarWide: true,

      leftSidebarMultiple: [
        (relations.customSidebarContent
          ? {
              content:
                relations.customSidebarContent
                  .slot('mode', 'multiline'),
            }
          : null),

        relations.newsSidebarBox ?? null,
      ],

      navLinkStyle: 'index',
      navLinks: [
        {auto: 'home', current: true},

        ...(
          relations.customNavLinkContents
            ?.map(content => ({
              html:
                content.slots({
                  mode: 'inline',
                  preferShortLinkNames: true,
                }),
            }))
          ?? []),
      ],
    });
  },
};
