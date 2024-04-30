export default {
  contentDependencies: [
    'generatePageLayout',
    'generatePageSidebar',
    'generatePageSidebarBox',
    'generateWikiHomeAlbumsRow',
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

    relations.sidebar =
      relation('generatePageSidebar');

    if (homepageLayout.sidebarContent) {
      relations.customSidebarBox =
        relation('generatePageSidebarBox');

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

    relations.contentRows =
      homepageLayout.rows.map(row => {
        switch (row.type) {
          case 'albums':
            return relation('generateWikiHomeAlbumsRow', row);
          default:
            return null;
        }
      });

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

      mainContent: [
        relations.contentRows,
      ],

      leftSidebar:
        relations.sidebar.slots({
          wide: true,

          boxes: [
            relations.customSidebarContent &&
              relations.customSidebarBox.slots({
                attributes: {class: 'custom-content-sidebar-box'},
                collapsible: false,

                content:
                  relations.customSidebarContent
                    .slot('mode', 'multiline'),
              }),

            relations.newsSidebarBox,
          ],
        }),

      navLinkStyle: 'index',
      navLinks: [
        {auto: 'home', current: true},

        ...(
          relations.customNavLinkContents
            ?.map(content => ({
              html:
                content.slots({
                  mode: 'single-link',
                  preferShortLinkNames: true,
                }),
            }))
          ?? []),
      ],
    });
  },
};
