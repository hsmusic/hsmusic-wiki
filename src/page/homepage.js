// Homepage specification.

import {
  bindOpts,
  empty,
  withEntries,
} from '../util/sugar.js';

import {
  getNewAdditions,
  getNewReleases,
} from '../util/wiki-data.js';

export const description = `main wiki homepage`;

export function writeTargetless({wikiData}) {
  const {newsData, homepageLayout, wikiInfo} = wikiData;

  const rowData = homepageLayout.rows?.map(row => {
    const {color, name, type} = row;
    const entry = {row, color, name, type};

    switch (type) {
      case 'albums': {
        entry.displayStyle = row.displayStyle;

        switch (row.sourceGroupByRef) {
          case 'new-releases':
            entry.entries = getNewReleases(row.countAlbumsFromGroup, {wikiData});
            break;
          case 'new-additions':
            entry.entries = getNewAdditions(row.countAlbumsFromGroup, {wikiData});
            break;
          default:
            entry.entries = row.sourceGroup
              ? row.sourceGroup.albums
                  .slice()
                  .reverse()
                  .filter(album => album.isListedOnHomepage)
                  .slice(0, row.countAlbumsFromGroup)
                  .map(album => ({item: album}))
              : [];
        }

        if (!empty(row.sourceAlbums)) {
          entry.entries.push(...row.sourceAlbums.map(album => ({item: album})));
        }

        entry.actionLinks = row.actionLinks ?? [];
        break;
      }
    }

    return entry;
  });

  const transformActionLinks = (actionLinks, {
    transformInline,
  }) =>
    actionLinks?.map(transformInline)
      .map(a => a.replace('<a', '<a class="box grid-item"'));

  const page = {
    type: 'page',
    path: ['home'],
    page: ({
      getAlbumGridHTML,
      getAlbumCover,
      getCarouselHTML,
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
        headingMode: 'none',

        content: [
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
                  entry.displayStyle === 'grid' &&
                    html.tag('div', {class: 'grid-listing'}, [
                      ...html.fragment(
                        getAlbumGridHTML({
                          entries: entry.entries,
                          lazy: i > 0,
                        })),

                      html.tag('div',
                        {
                          [html.onlyIfContent]: true,
                          class: 'grid-actions',
                        },
                        transformActionLinks(entry.actionLinks, {
                          transformInline,
                        })),
                    ]),

                  ...html.fragment(
                    entry.type === 'albums' &&
                    entry.displayStyle === 'carousel' && [
                      getCarouselHTML({
                        items: entry.entries.map(e => e.item),
                        // Lazy carousels are kinda glitchy, possibly browser-dependant
                        // lazy: i > 0,
                        srcFn: getAlbumCover,
                        linkFn: link.album,
                      }),

                      entry.actionLinks.length &&
                        html.tag('div', {class: 'grid-actions'},
                          transformActionLinks(entry.actionLinks, {
                            transformInline,
                          })),
                    ]),
                ]))),
        ],
      },

      sidebarLeft: {
        collapse: false,
        wide: true,
        stickyMode: 'none',

        multiple: [
          homepageLayout.sidebarContent &&
            transformMultiline(homepageLayout.sidebarContent, {
              thumb: 'medium',
            }),

          wikiInfo.enableNews &&
            [
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

                      transformMultiline(entry.contentShort, {
                        thumb: 'medium',
                      }),

                      entry.contentShort !== entry.content &&
                        link.newsEntry(entry, {
                          text: language.$('homepage.news.entry.viewRest')
                        }),
                    ])),
            ],
        ],
      },

      nav: {
        linkContainerClasses: ['nav-links-index'],
        links: [
          link.home('', {text: wikiInfo.nameShort, class: 'current', to}),

          ...html.fragment(
            homepageLayout.navbarLinks?.map(text =>
              transformInline(text, {
                link:
                  withEntries(link, entries =>
                    entries.map(([key, fn]) =>
                      [key, bindOpts(fn, {
                        preferShortName: true,
                      })])),
              }))),
        ]
          .filter(Boolean)
          .map((html) => ({html})),
      },
    }),
  };

  return [page];
}
