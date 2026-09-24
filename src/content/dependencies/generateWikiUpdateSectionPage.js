export default {
  relations: (relation, section) => ({
    layout:
      relation('generatePageLayout'),

    sidebar:
      relation('generateWikiUpdateSectionSidebar', section),

    section:
      relation('generateWikiUpdateSection', section),

    updateLink:
      relation('linkWikiUpdate', section.update),

    wikiUpdateIndexLink:
      relation('linkWikiUpdateIndex'),

    mainUpdateLink:
      (section.update.isRegularUpdate && section.update.mainUpdate
        ? relation('linkWikiUpdate', section.update.mainUpdate)
        : null),

    updateNavLink:
      relation('linkWikiUpdate', section.update),

    sectionLink:
      relation('linkWikiUpdateSectionPage', section),

    navLinks:
      relation('generateWikiUpdateSectionNavLinks', section),
  }),

  data: (section) => ({
    updateName:
      section.update.name,

    updateNameHTML:
      section.update.nameHTML,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('wikiUpdatePage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
            update:
              html.ifelse([
                html.permit(data.updateNameHTML),
                language.sanitize(data.updateName),
              ]),
          }),

        wallpaper: 'meta',
        headingMode: 'sticky',

        mainClasses: ['long-content'],
        mainContent: [
          html.tag('p',
            {[html.joinChildren]: html.tag('br')},

            language.$(pageCapsule, 'info.updateSection'),
            language.$(pageCapsule, 'info.backToEntireUpdateChangelog', {
              update: relations.updateLink,
            })),

          relations.section,
        ],

        leftSidebar: relations.sidebar,

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},
          {html: relations.wikiUpdateIndexLink},

          relations.mainUpdateLink &&
            {html: relations.mainUpdateLink},

          {
            html: relations.updateNavLink.slot('attributes', {class: 'current'}),
          },

          {
            html: relations.sectionLink.slot('attributes', {class: 'current'}),
            accent: relations.navLinks,
          },
        ],
      })),
};
