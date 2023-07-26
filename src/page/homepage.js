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

export function pathsTargetless({wikiData}) {
  return [
    {
      type: 'page',
      path: ['home'],

      contentFunction: {
        name: 'generateWikiHomePage',
        args: [wikiData.homepageLayout],
      },
    },
  ];
}

/*
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
    }),
  };

  return [page];
}
*/
