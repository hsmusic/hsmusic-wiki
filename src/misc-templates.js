// Miscellaneous utility functions which are useful across page specifications.
// These are made available right on a page spec's ({wikiData, language, ...})
// args object!

import T from './data/things/index.js';

import {
  empty,
  repeat,
  unique,
} from './util/sugar.js';

import {thumb} from './util/urls.js';

import {
  getTotalDuration,
  sortAlbumsTracksChronologically,
  sortChronologically,
} from './util/wiki-data.js';

// Chronology links

function unbound_generateChronologyLinks(currentThing, {
  html,
  language,
  link,

  generateNavigationLinks,

  dateKey = 'date',
  contribKey,
  getThings,
  headingString,
}) {
  const contributions = currentThing[contribKey];

  if (empty(contributions)) {
    return html.blank();
  }

  if (contributions.length > 8) {
    return html.tag('div', {class: 'chronology'},
      language.$('misc.chronology.seeArtistPages'));
  }

  return contributions
    .map(({who: artist}) => {
      const thingsUnsorted = unique(getThings(artist))
        .filter((t) => t[dateKey]);

      // Kinda a hack, but we automatically detect which is (probably) the
      // right function to use here.
      const args = [thingsUnsorted, {getDate: (t) => t[dateKey]}];
      const things = (
        thingsUnsorted.every(t => t instanceof T.Album || t instanceof T.Track)
          ? sortAlbumsTracksChronologically(...args)
          : sortChronologically(...args));

      if (things.length === 0) return '';

      const index = things.indexOf(currentThing);

      if (index === -1) return '';

      const heading = (
        html.tag('span', {class: 'heading'},
          language.$(headingString, {
            index: language.formatIndex(index + 1, {language}),
            artist: link.artist(artist),
          })));

      const navigation = things.length > 1 &&
        html.tag('span',
          {
            [html.onlyIfContent]: true,
            class: 'buttons',
          },
          generateNavigationLinks(currentThing, {
            data: things,
            isMain: false,
          }));

      return (
        html.tag('div', {class: 'chronology'},
          (navigation
            ? language.$('misc.chronology.withNavigation', {
                heading,
                navigation,
              })
            : heading)));
    });
}

// Divided track lists

function unbound_generateTrackListDividedByGroups(tracks, {
  html,
  language,

  getTrackItem,
  wikiData,
}) {
  const {divideTrackListsByGroups: groups} = wikiData.wikiInfo;

  if (empty(groups)) {
    return html.tag('ul',
      tracks.map(t => getTrackItem(t)));
  }

  const lists = Object.fromEntries(
    groups.map((group) => [
      group.directory,
      {group, tracks: []}
    ]));

  const other = [];

  for (const track of tracks) {
    const {album} = track;
    const group = groups.find((g) => g.albums.includes(album));
    if (group) {
      lists[group.directory].tracks.push(track);
    } else {
      other.push(track);
    }
  }

  const dt = name =>
    html.tag('dt',
      language.$('trackList.group', {
        group: name,
      }));

  const ddul = tracks =>
    html.tag('dd',
      html.tag('ul',
        tracks.map(t => getTrackItem(t))));

  return html.tag('dl', [
    ...Object.values(lists)
      .filter(({tracks}) => tracks.length)
      .flatMap(({group, tracks}) => [
        dt(group.name),
        ddul(tracks),
      ]),

    ...html.fragment(
      other.length && [
        dt(language.$('trackList.group.other')),
        ddul(other),
      ]),
  ]);
}

// Grids

function unbound_getGridHTML({
  img,
  html,
  language,

  getRevealStringFromArtTags,

  entries,
  srcFn,
  linkFn,
  noSrcTextFn = () => '',
  altFn = () => '',
  detailsFn = null,
  lazy = true,
}) {
  return entries
    .map(({large, item}, i) =>
      linkFn(item, {
        class: ['grid-item', 'box', large && 'large-grid-item'],
        text: html.fragment([
          img({
            src: srcFn(item),
            alt: altFn(item),
            thumb: 'medium',
            lazy: typeof lazy === 'number' ? i >= lazy : lazy,
            square: true,
            reveal: getRevealStringFromArtTags(item.artTags, {language}),
            noSrcText: noSrcTextFn(item),
          }),
          html.tag('span', item.name),
          detailsFn &&
            html.tag('span', detailsFn(item)),
        ]),
      }))
    .join('\n');
}

function unbound_getAlbumGridHTML({
  getAlbumCover,
  getGridHTML,
  link,
  language,
  details = false,
  ...props
}) {
  return getGridHTML({
    srcFn: getAlbumCover,
    linkFn: link.album,
    detailsFn:
      details &&
      ((album) =>
        language.$('misc.albumGrid.details', {
          tracks: language.countTracks(album.tracks.length, {unit: true}),
          time: language.formatDuration(getTotalDuration(album.tracks)),
        })),
    noSrcTextFn: (album) =>
      language.$('misc.albumGrid.noCoverArt', {
        album: album.name,
      }),
    ...props,
  });
}

function unbound_getFlashGridHTML({
  link,

  getFlashCover,
  getGridHTML,
  ...props
}) {
  return getGridHTML({
    srcFn: getFlashCover,
    linkFn: link.flash,
    ...props,
  });
}

// Carousel reels

// Layout constants:
//
// Carousels support fitting 4-18 items, with a few "dead" zones to watch out
// for, namely when a multiple of 6, 5, or 4 columns would drop the last tiles.
//
// Carousels are limited to 1-3 rows and 4-6 columns.
// Lower edge case: 1-3 items are treated as 4 items (with blank space).
// Upper edge case: all items past 18 are dropped (treated as 18 items).
//
// This is all done through JS instead of CSS because it's just... ANNOYING...
// to write a mapping like this in CSS lol.
const carouselLayoutMap = [
  // 0-3
  null, null, null, null,

  // 4-6
  {rows: 1, columns: 4}, //  4: 1x4, drop 0
  {rows: 1, columns: 5}, //  5: 1x5, drop 0
  {rows: 1, columns: 6}, //  6: 1x6, drop 0

  // 7-12
  {rows: 1, columns: 6}, //  7: 1x6, drop 1
  {rows: 2, columns: 4}, //  8: 2x4, drop 0
  {rows: 2, columns: 4}, //  9: 2x4, drop 1
  {rows: 2, columns: 5}, // 10: 2x5, drop 0
  {rows: 2, columns: 5}, // 11: 2x5, drop 1
  {rows: 2, columns: 6}, // 12: 2x6, drop 0

  // 13-18
  {rows: 2, columns: 6}, // 13: 2x6, drop 1
  {rows: 2, columns: 6}, // 14: 2x6, drop 2
  {rows: 3, columns: 5}, // 15: 3x5, drop 0
  {rows: 3, columns: 5}, // 16: 3x5, drop 1
  {rows: 3, columns: 5}, // 17: 3x5, drop 2
  {rows: 3, columns: 6}, // 18: 3x6, drop 0
];

const minCarouselLayoutItems = carouselLayoutMap.findIndex(x => x !== null);
const maxCarouselLayoutItems = carouselLayoutMap.length - 1;
const shortestCarouselLayout = carouselLayoutMap[minCarouselLayoutItems];
const longestCarouselLayout = carouselLayoutMap[maxCarouselLayoutItems];

function unbound_getCarouselHTML({
  html,
  img,

  items,
  lazy = false,

  altFn = () => '',
  linkFn = (x, {text}) => text,
  srcFn,
}) {
  if (empty(items)) {
    return;
  }

  const {rows, columns} = (
    items.length < minCarouselLayoutItems ? shortestCarouselLayout :
    items.length > maxCarouselLayoutItems ? longestCarouselLayout :
    carouselLayoutMap[items.length]);

  items = items.slice(0, maxCarouselLayoutItems + 1);

  return html.tag('div',
    {
      class: 'carousel-container',
      'data-carousel-rows': rows,
      'data-carousel-columns': columns,
    },
    repeat(3,
      html.tag('div',
        {
          class: 'carousel-grid',
          'aria-hidden': 'true',
        },
        items
          .filter(item => srcFn(item))
          .filter(item => item.artTags.every(tag => !tag.isContentWarning))
          .map((item, i) =>
            html.tag('div', {class: 'carousel-item'},
              linkFn(item, {
                attributes: {
                  tabindex: '-1',
                },
                text:
                  img({
                    src: srcFn(item),
                    alt: altFn(item),
                    thumb: 'small',
                    lazy: typeof lazy === 'number' ? i >= lazy : lazy,
                    square: true,
                  }),
              }))))));
}

// Nav-bar links

function unbound_generateInfoGalleryLinks(currentThing, isGallery, {
  link,
  language,

  linkKeyGallery,
  linkKeyInfo,
}) {
  return [
    link[linkKeyInfo](currentThing, {
      class: isGallery ? '' : 'current',
      text: language.$('misc.nav.info'),
    }),
    link[linkKeyGallery](currentThing, {
      class: isGallery ? 'current' : '',
      text: language.$('misc.nav.gallery'),
    }),
  ].join(', ');
}

// Generate "previous" and "next" links relative to a given current thing and a
// data set (array of things) which includes it, optionally including additional
// provided links like "random". This is for use in navigation bars and other
// inline areas.
//
// By default, generated links include ID attributes which enable client-side
// keyboard shortcuts. Provide isMain: false to disable this (if the generated
// links aren't the for the page's primary navigation).
function unbound_generateNavigationLinks(current, {
  language,
  link,

  additionalLinks = [],
  data,
  isMain = true,
  linkKey = 'anything',
  returnAsArray = false,
}) {
  let previousLink, nextLink;

  if (current) {
    const linkFn = link[linkKey].bind(link);

    const index = data.indexOf(current);
    const previousThing = data[index - 1];
    const nextThing = data[index + 1];

    previousLink = previousThing &&
      linkFn(previousThing, {
        attributes: {
          id: isMain && 'previous-button',
          title: previousThing.name,
        },
        text: language.$('misc.nav.previous'),
        color: false,
      });

    nextLink = nextThing &&
      linkFn(nextThing, {
        attributes: {
          id: isMain && 'next-button',
          title: nextThing.name,
        },
        text: language.$('misc.nav.next'),
        color: false,
      });
  }

  const links = [
    previousLink,
    nextLink,
    ...additionalLinks,
  ].filter(Boolean);

  if (returnAsArray) {
    return links;
  } else if (empty(links)) {
    return '';
  } else {
    return language.formatUnitList(links);
  }
}

// Sticky heading, ooooo

function unbound_generateStickyHeadingContainer({
  html,
  img,

  class: classes,
  coverSrc,
  coverAlt,
  coverArtTags,
  title,
}) {
  return html.tag('div',
    {class: [
      'content-sticky-heading-container',
      coverSrc && 'has-cover',
    ].concat(classes)},
    [
      html.tag('div', {class: 'content-sticky-heading-row'}, [
        html.tag('h1', title),

        // Cover art in the sticky heading never uses the 'reveal' setting
        // because it's too small to effectively display content warnings.
        // Instead, if art has content warnings, it's hidden from the sticky
        // heading by default, and will be enabled once the main cover art
        // is revealed.
        coverSrc &&
          html.tag('div', {class: 'content-sticky-heading-cover-container'},
            html.tag('div',
              {
                class: [
                  'content-sticky-heading-cover',
                  coverArtTags .some(tag => !tag.isContentWarning) &&
                    'content-sticky-heading-cover-needs-reveal',
                ],
              },
              img({
                src: coverSrc,
                alt: coverAlt,
                thumb: 'small',
                link: false,
                square: true,
              }))),
      ]),

      html.tag('div', {class: 'content-sticky-subheading-row'},
        html.tag('h2', {class: 'content-sticky-subheading'})),
    ]);
}

// Footer stuff

function unbound_getFooterLocalizationLinks({
  html,
  defaultLanguage,
  language,
  languages,
  pagePath,
  to,
}) {
  const links = Object.entries(languages)
    .filter(([code, language]) => code !== 'default' && !language.hidden)
    .map(([code, language]) => language)
    .sort(({name: a}, {name: b}) => (a < b ? -1 : a > b ? 1 : 0))
    .map((language) =>
      html.tag('span',
        html.tag('a',
          {
            href:
              language === defaultLanguage
                ? to(
                    'localizedDefaultLanguage.' + pagePath[0],
                    ...pagePath.slice(1))
                : to(
                    'localizedWithBaseDirectory.' + pagePath[0],
                    language.code,
                    ...pagePath.slice(1)),
          },
          language.name)));

  return html.tag('div', {class: 'footer-localization-links'},
    language.$('misc.uiLanguage', {
      languages: links.join('\n'),
    }));
}

// Exports

export {
  unbound_generateChronologyLinks as generateChronologyLinks,

  unbound_generateTrackListDividedByGroups as generateTrackListDividedByGroups,

  unbound_getGridHTML as getGridHTML,
  unbound_getAlbumGridHTML as getAlbumGridHTML,
  unbound_getFlashGridHTML as getFlashGridHTML,

  unbound_getCarouselHTML as getCarouselHTML,

  unbound_generateInfoGalleryLinks as generateInfoGalleryLinks,
  unbound_generateNavigationLinks as generateNavigationLinks,

  unbound_generateStickyHeadingContainer as generateStickyHeadingContainer,

  unbound_getFooterLocalizationLinks as getFooterLocalizationLinks,
}
