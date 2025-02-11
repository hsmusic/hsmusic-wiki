export default {
  contentDependencies: [
    'generatePageLayout',
    'generatePageSidebar',
    'generatePageSidebarBox',
    'generateWikiHomepageNewsBox',
    'generateWikiHomepageSection',
    'transformContent',
  ],

  extraDependencies: ['wikiData'],

  sprawl: ({wikiInfo}) => ({
    wikiName:
      wikiInfo.name,

    enableNews:
      wikiInfo.enableNews,
  }),

  relations: (relation, sprawl, homepageLayout) => ({
    layout:
      relation('generatePageLayout'),

    sidebar:
      relation('generatePageSidebar'),

    customSidebarBox:
      relation('generatePageSidebarBox'),

    customSidebarContent:
      relation('transformContent', homepageLayout.sidebarContent),

    newsSidebarBox:
      (sprawl.enableNews
        ? relation('generateWikiHomepageNewsBox')
        : null),

    customNavLinkContents:
      homepageLayout.navbarLinks
        .map(content => relation('transformContent', content)),

    sections:
      homepageLayout.sections
        .map(section => relation('generateWikiHomepageSection', section)),
  }),

  data: (sprawl) => ({
    wikiName:
      sprawl.wikiName,
  }),

  generate: (data, relations) =>
    relations.layout.slots({
      title: data.wikiName,
      showWikiNameInTitle: false,

      mainClasses: ['top-index'],
      headingMode: 'static',

      mainContent: [
        relations.sections,
      ],

      leftSidebar:
        relations.sidebar.slots({
          wide: true,

          boxes: [
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

        ...
          relations.customNavLinkContents.map(content => ({
            html:
              content.slots({
                mode: 'single-link',
                preferShortLinkNames: true,
              }),
          })),
      ],
    }),
};
