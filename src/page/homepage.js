// Homepage specification.

import {getNewAdditions, getNewReleases} from '../util/wiki-data.js';

export function writeTargetless({wikiData}) {
  const {newsData, staticPageData, homepageLayout, wikiInfo} = wikiData;

  const rowData = homepageLayout.rows?.map(row => {
    const {color, name, type} = row;
    const entry = {row, color, name, type};

    switch (type) {
      case 'albums': {
        switch (row.sourceGroupByRef) {
          case 'new-releases':
            entry.gridEntries = getNewReleases(row.countAlbumsFromGroup, {wikiData});
            break;
          case 'new-additions':
            entry.gridEntries = getNewAdditions(row.countAlbumsFromGroup, {wikiData});
            break;
          default:
            entry.gridEntries = row.sourceGroup
              ? row.sourceGroup.albums
                  .slice()
                  .reverse()
                  .filter(album => album.isListedOnHomepage)
                  .slice(0, row.countAlbumsFromGroup)
                  .map(album => ({item: album}))
              : [];
        }

        if (row.sourceAlbums.length) {
          entry.gridEntries.push(...row.sourceAlbums.map(album => ({item: album})));
        }

        entry.actionLinks = row.actionLinks ?? [];
        break;
      }
    }

    return entry;
  });

  const page = {
    type: 'page',
    path: ['home'],
    page: ({
      getAlbumGridHTML,
      getLinkThemeString,
      html,
      language,
      link,
      to,
      transformInline,
      transformMultiline,
    }) => ({
      title: wikiInfo.name,
      showWikiNameInTitle: false,

      meta: {
        description: wikiInfo.description,
      },

      main: {
        classes: ['top-index'],
        content: html.fragment([
          html.tag('h1',
            wikiInfo.name),

          ...html.fragment(
            rowData.map((entry, i) =>
              html.tag('section',
                {
                  class: 'row',
                  style: getLinkThemeString(entry.color),
                },
                [
                  html.tag('h2',
                    entry.name),

                  entry.type === 'albums' &&
                    html.tag('div', {class: 'grid-listing'}, [
                      ...html.fragment(
                        getAlbumGridHTML({
                          entries: entry.gridEntries,
                          lazy: i > 0,
                        })),

                      entry.actionLinks.length &&
                        html.tag('div', {class: 'grid-actions'},
                          entry.actionLinks.map(action =>
                            transformInline(action)
                              .replace('<a', '<a class="box grid-item"'))),
                    ]),
                ]))),
        ]),
      },

      sidebarLeft: homepageLayout.sidebarContent && {
        wide: true,
        collapse: false,
        // This is a pretty filthy hack! 8ut otherwise, the [[news]] part
        // gets treated like it's a reference to the track named "news",
        // which o8viously isn't what we're going for. Gotta catch that
        // 8efore we pass it to transformMultiline, 'cuz otherwise it'll
        // get repl8ced with just the word "news" (or anything else that
        // transformMultiline does with references it can't match) -- and
        // we can't match that for replacing it with the news column!
        //
        // And no, I will not make [[news]] into part of transformMultiline
        // (even though that would 8e hilarious).
        content:
          transformMultiline(
            homepageLayout.sidebarContent
              .replace('[[news]]', '__GENERATE_NEWS__')
          )
            .replace('<p>__GENERATE_NEWS__</p>',
              wikiInfo.enableNews
                ? [
                    html.tag('h1',
                      language.$('homepage.news.title')),

                    ...newsData
                      .slice(0, 3)
                      .map((entry, i) =>
                        html.tag('article',
                          {
                            class: [
                              'news-entry',
                              i === 0 && 'first-news-entry',
                            ],
                          },
                          [
                            html.tag('h2', [
                              html.tag('time',
                                language.formatDate(entry.date)),
                              link.newsEntry(entry),
                            ]),

                            transformMultiline(entry.contentShort),

                            entry.contentShort !== entry.content &&
                              link.newsEntry(entry, {
                                text: language.$('homepage.news.entry.viewRest')
                              }),
                          ])),
                  ].join('\n')
                : html.tag('p',
                    html.tag('i',
                      `News requested in content description but this feature isn't enabled`))),
      },

      nav: {
        linkContainerClasses: ['nav-links-index'],
        links: [
          link.home('', {text: wikiInfo.nameShort, class: 'current', to}),

          wikiInfo.enableListings &&
            link.listingIndex('', {
              text: language.$('listingIndex.title'),
              to,
            }),

          wikiInfo.enableNews &&
            link.newsIndex('', {text: language.$('newsIndex.title'), to}),

          wikiInfo.enableFlashesAndGames &&
            link.flashIndex('', {text: language.$('flashIndex.title'), to}),

          ...staticPageData
            .filter((page) => page.showInNavigationBar)
            .map((page) => link.staticPage(page, {text: page.nameShort})),
        ]
          .filter(Boolean)
          .map((html) => ({html})),
      },
    }),
  };

  return [page];
}
