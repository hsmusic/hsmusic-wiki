export default {
  relations: (relation, update) => ({
    layout:
      relation('generatePageLayout'),

    releaseDateLine:
      relation('generateWikiUpdateReleaseDateLine', update),

    newsEntryLink:
      (update.newsEntry
        ? relation('linkNewsEntry', update.newsEntry)
        : null),

    mainUpdateLink:
      (update.isRegularUpdate && update.mainUpdate
        ? relation('linkWikiUpdate', update.mainUpdate)
        : null),

    nearbyMainUpdates:
      relation('generateWikiUpdateNearbyMainUpdates', update),

    subsequentRegularUpdates:
      relation('generateWikiUpdateSubsequentRegularUpdates', update),

    changes:
      relation('transformContent', update.changes),

    sections:
      update.sections
        .map(section => relation('generateWikiUpdateSection', section)),

    wikiUpdateIndexLink:
      relation('linkWikiUpdateIndex'),

    navLinks:
      (update.isMainUpdate
        ? relation('generateWikiUpdateNavLinks', update)
        : null),
  }),

  data: (update) => ({
    name:
      update.name,

    nameHTML:
      update.nameHTML,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('wikiUpdatePage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
            update:
              html.ifelse([
                html.permit(data.nameHTML),
                language.sanitize(data.name),
              ]),
          }),

        wallpaper: 'meta',
        headingMode: 'sticky',

        mainClasses: ['long-content'],
        mainContent: [
          html.tag('p',
            {[html.joinChildren]: html.tag('br')},

            relations.releaseDateLine,

            language.$(pageCapsule, 'info.readNewsEntry', {
              [language.onlyIfOptions]: ['entry'],
              entry: relations.newsEntryLink,
            }),

            language.$(pageCapsule, 'info.backToMainUpdate', {
              [language.onlyIfOptions]: ['mainUpdate'],
              mainUpdate: relations.mainUpdateLink,
            })),

          relations.nearbyMainUpdates,
          relations.subsequentRegularUpdates,

          relations.changes,

          relations.sections
            .map(section =>
              section.slots({
                showHashPageLinks: true
              })),
        ],

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},
          {html: relations.wikiUpdateIndexLink},

          relations.mainUpdateLink &&
            {html: relations.mainUpdateLink},

          {auto: 'current', accent: relations.navLinks},
        ],
      })),
};
