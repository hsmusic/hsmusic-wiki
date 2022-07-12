/** @format */

// Group page specifications.

import {getTotalDuration, sortChronologically} from '../util/wiki-data.js';

export function targets({wikiData}) {
  return wikiData.groupData;
}

export function write(group, {wikiData}) {
  const {listingSpec, wikiInfo} = wikiData;

  const {albums} = group;
  const tracks = albums.flatMap((album) => album.tracks);
  const totalDuration = getTotalDuration(tracks);

  const albumLines = group.albums.map((album) => ({
    album,
    otherGroup: album.groups.find((g) => g !== group),
  }));

  const infoPage = {
    type: 'page',
    path: ['groupInfo', group.directory],
    page: ({
      fancifyURL,
      generateInfoGalleryLinks,
      generatePreviousNextLinks,
      getLinkThemeString,
      getThemeString,
      html,
      language,
      link,
      transformMultiline,
    }) => ({
      title: language.$('groupInfoPage.title', {group: group.name}),
      theme: getThemeString(group.color),

      main: {
        content: [
          html.tag('h1',
            language.$('groupInfoPage.title', {
              group: group.name
            })),

          group.urls?.length &&
            html.tag('p',
              language.$('releaseInfo.visitOn', {
                links: language.formatDisjunctionList(
                  group.urls.map(url => fancifyURL(url, {language}))),
              })),

          group.description &&
            html.tag('blockquote',
              transformMultiline(group.description)),

          ...group.albums ? [
            html.tag('h2',
              language.$('groupInfoPage.albumList.title')),

            html.tag('p',
              language.$('groupInfoPage.viewAlbumGallery', {
                link: link.groupGallery(group, {
                  text: language.$('groupInfoPage.viewAlbumGallery.link'),
                }),
              })),

            html.tag('ul',
              albumLines.map(({album, otherGroup}) => {
                const item = album.date
                  ? language.$('groupInfoPage.albumList.item', {
                      year: album.date.getFullYear(),
                      album: link.album(album),
                    })
                  : language.$('groupInfoPage.albumList.item.withoutYear', {
                      album: link.album(album),
                    });
                return html.tag('li',
                  otherGroup
                    ? language.$('groupInfoPage.albumList.item.withAccent', {
                        item,
                        accent: html.tag('span',
                          {class: 'other-group-accent'},
                          language.$('groupInfoPage.albumList.item.otherGroupAccent', {
                            group: link.groupInfo(otherGroup, {
                              color: false,
                            }),
                          })),
                      })
                    : item);
              })),
          ] : [],
        ],
      },

      sidebarLeft: generateGroupSidebar(group, false, {
        getLinkThemeString,
        html,
        language,
        link,
        wikiData,
      }),

      nav: generateGroupNav(group, false, {
        generateInfoGalleryLinks,
        generatePreviousNextLinks,
        language,
        link,
        wikiData,
      }),
    }),
  };

  const galleryPage = {
    type: 'page',
    path: ['groupGallery', group.directory],
    page: ({
      generateInfoGalleryLinks,
      generatePreviousNextLinks,
      getAlbumGridHTML,
      getLinkThemeString,
      getThemeString,
      html,
      language,
      link,
    }) => ({
      title: language.$('groupGalleryPage.title', {group: group.name}),
      theme: getThemeString(group.color),

      main: {
        classes: ['top-index'],
        content: [
          html.tag('h1',
            language.$('groupGalleryPage.title', {
              group: group.name,
            })),

          html.tag('p',
            {class: 'quick-info'},
            language.$('groupGalleryPage.infoLine', {
              tracks: html.tag('b',
                language.countTracks(tracks.length, {
                  unit: true,
                })),
              albums: html.tag('b',
                language.countAlbums(albums.length, {
                  unit: true,
                })),
              time: html.tag('b',
                language.formatDuration(totalDuration, {
                  unit: true,
                })),
              })),

          wikiInfo.enableGroupUI &&
          wikiInfo.enableListings &&
            html.tag('p',
              {class: 'quick-info'},
              language.$('groupGalleryPage.anotherGroupLine', {
                link: link.listing(
                  listingSpec.find(l => l.directory === 'groups/by-category'),
                  {
                    text: language.$('groupGalleryPage.anotherGroupLine.link'),
                  }),
              })),

          html.tag('div',
            {class: 'grid-listing'},
            getAlbumGridHTML({
              entries: sortChronologically(
                group.albums.map(album => ({
                  item: album,
                  directory: album.directory,
                  name: album.name,
                  date: album.date,
                }))
              ).reverse(),
              details: true,
            })),
        ],
      },

      sidebarLeft: generateGroupSidebar(group, true, {
        getLinkThemeString,
        html,
        language,
        link,
        wikiData,
      }),

      nav: generateGroupNav(group, true, {
        generateInfoGalleryLinks,
        generatePreviousNextLinks,
        language,
        link,
        wikiData,
      }),
    }),
  };

  return [infoPage, galleryPage];
}

// Utility functions

function generateGroupSidebar(currentGroup, isGallery, {
  getLinkThemeString,
  html,
  language,
  link,
  wikiData,
}) {
  const {groupCategoryData, wikiInfo} = wikiData;

  if (!wikiInfo.enableGroupUI) {
    return null;
  }

  const linkKey = isGallery ? 'groupGallery' : 'groupInfo';

  return {
    content: [
      html.tag('h1',
        language.$('groupSidebar.title')),

      ...groupCategoryData.map((category) =>
        html.tag('details',
          {
            open: category === currentGroup.category,
            class: category === currentGroup.category && 'current',
          },
          [
            html.tag('summary',
              {style: getLinkThemeString(category.color)},
              language.$('groupSidebar.groupList.category', {
                category: `<span class="group-name">${category.name}</span>`,
              })),
            html.tag('ul',
              category.groups.map((group) =>
                html.tag('li',
                  {
                    class: group === currentGroup && 'current',
                    style: getLinkThemeString(group.color),
                  },
                  language.$('groupSidebar.groupList.item', {
                    group: link[linkKey](group),
                  })))),
          ])),
    ],
  };
}

function generateGroupNav(currentGroup, isGallery, {
  generateInfoGalleryLinks,
  generatePreviousNextLinks,
  link,
  language,
  wikiData,
}) {
  const {groupData, wikiInfo} = wikiData;

  if (!wikiInfo.enableGroupUI) {
    return {simple: true};
  }

  const linkKey = isGallery ? 'groupGallery' : 'groupInfo';

  const infoGalleryLinks = generateInfoGalleryLinks(currentGroup, isGallery, {
    linkKeyGallery: 'groupGallery',
    linkKeyInfo: 'groupInfo',
  });

  const previousNextLinks = generatePreviousNextLinks(currentGroup, {
    data: groupData,
    linkKey,
  });

  return {
    linkContainerClasses: ['nav-links-hierarchy'],
    links: [
      {toHome: true},
      wikiInfo.enableListings && {
        path: ['localized.listingIndex'],
        title: language.$('listingIndex.title'),
      },
      {
        html: language.$('groupPage.nav.group', {
          group: link[linkKey](currentGroup, {class: 'current'}),
        }),
      },
      {
        divider: false,
        html: previousNextLinks
          ? `(${infoGalleryLinks}; ${previousNextLinks})`
          : `(${previousNextLinks})`,
      },
    ],
  };
}
