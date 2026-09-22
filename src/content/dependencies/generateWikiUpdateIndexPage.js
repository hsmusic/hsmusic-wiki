import {stitchArrays} from '#sugar';

export default {
  sprawl: ({wikiUpdateData}) => ({
    mainUpdates:
      wikiUpdateData
        .filter(update => update.isMainUpdate),
  }),

  relations: (relation, sprawl) => ({
    layout:
      relation('generatePageLayout'),

    mainWikiUpdateLinks:
      sprawl.mainUpdates
        .map(update => relation('linkWikiUpdate', update)),

    releaseDateLines:
      sprawl.mainUpdates
        .map(update => relation('generateWikiUpdateReleaseDateLine', update)),

    newsEntryLinks:
      sprawl.mainUpdates
        .map(update =>
          (update.newsEntry
            ? relation('linkNewsEntry', update.newsEntry)
            : null)),

    subsequentRegularUpdates:
      sprawl.mainUpdates
        .map(update => relation('generateWikiUpdateSubsequentRegularUpdates', update)),
  }),

  data: (sprawl) => ({
    mainUpdateDates:
      sprawl.mainUpdates
        .map(update => update.date),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('wikiUpdateIndex', indexCapsule =>
      relations.layout.slots({
        title:
          language.$(indexCapsule, 'title'),

        wallpaper: 'meta',

        headingMode: 'sticky',

        mainClasses: ['long-content', 'news-index'],
        mainContent: [
          stitchArrays({
            mainUpdateLink: relations.mainWikiUpdateLinks,
            releaseDateLine: relations.releaseDateLines,
            newsEntryLink: relations.newsEntryLinks,
            subsequentRegularUpdates: relations.subsequentRegularUpdates,
            mainUpdateDate: data.mainUpdateDates,
          }).map(({
              mainUpdateLink,
              releaseDateLine,
              newsEntryLink,
              subsequentRegularUpdates,
              mainUpdateDate,
            }) => [
              html.tag('h2',
                html.tag('time', {[html.onlyIfContent]: true},
                  language.formatDate(mainUpdateDate)),

                mainUpdateLink),

              html.tag('p', {[html.joinChildren]: html.tag('br')},
                releaseDateLine,

                language.$('wikiUpdatePage.info.readNewsEntry', {
                  [language.onlyIfOptions]: ['entry'],
                  entry: newsEntryLink,
                })),

              subsequentRegularUpdates,
            ]),
        ],

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},
          {auto: 'current'},
        ],
      }))
}
