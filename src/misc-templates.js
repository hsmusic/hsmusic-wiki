// Miscellaneous utility functions which are useful across page specifications.
// These are made available right on a page spec's ({wikiData, language, ...})
// args object!

import {Track, Album} from './data/things.js';

import {
  empty,
  unique,
} from './util/sugar.js';

import {
  getTotalDuration,
  sortAlbumsTracksChronologically,
  sortChronologically,
} from './util/wiki-data.js';

const BANDCAMP_DOMAINS = ['bc.s3m.us', 'music.solatrux.com'];

const MASTODON_DOMAINS = ['types.pl'];

// "Additional Files" listing

function unbound_generateAdditionalFilesShortcut(additionalFiles, {
  html,
  language,
}) {
  if (empty(additionalFiles)) return '';

  return language.$('releaseInfo.additionalFiles.shortcut', {
    anchorLink:
      html.tag('a',
        {href: '#additional-files'},
        language.$('releaseInfo.additionalFiles.shortcut.anchorLink')),
    titles: language.formatUnitList(
      additionalFiles.map(g => g.title)),
  });
}

function unbound_generateAdditionalFilesList(additionalFiles, {
  html,
  language,

  getFileSize,
  linkFile,
}) {
  if (empty(additionalFiles)) return [];

  const fileCount = additionalFiles.flatMap((g) => g.files).length;

  return html.fragment([
    html.tag('p',
      {id: 'additional-files'},
      language.$('releaseInfo.additionalFiles.heading', {
        additionalFiles: language.countAdditionalFiles(fileCount, {
          unit: true,
        }),
      })),

    html.tag('dl',
      additionalFiles.flatMap(({title, description, files}) => [
        html.tag('dt',
          (description
            ? language.$('releaseInfo.additionalFiles.entry.withDescription', {
                title,
                description,
              })
            : language.$('releaseInfo.additionalFiles.entry', {title}))),

        html.tag('dd',
          html.tag('ul',
            files.map((file) => {
              const size = getFileSize(file);
              return html.tag('li',
                (size
                  ? language.$('releaseInfo.additionalFiles.file.withSize', {
                      file: linkFile(file),
                      size: language.formatFileSize(size),
                    })
                  : language.$('releaseInfo.additionalFiles.file', {
                      file: linkFile(file),
                    })));
            }))),
      ])),
  ]);
}

// Artist strings

function unbound_getArtistString(artists, {
  html,
  language,
  link,

  iconifyURL,

  showIcons = false,
  showContrib = false,
}) {
  return language.formatConjunctionList(
    artists.map(({who, what}) => {
      const {urls} = who;

      const hasContribPart = !!(showContrib && what);
      const hasExternalPart = !!(showIcons && !empty(urls));

      const artistLink = link.artist(who);

      const externalLinks = hasExternalPart &&
        html.tag('span',
          {
            [html.noEdgeWhitespace]: true,
            class: 'icons'
          },
          language.formatUnitList(
            urls.map(url => iconifyURL(url, {language}))));

      return (
        (hasContribPart
          ? (hasExternalPart
              ? language.$('misc.artistLink.withContribution.withExternalLinks', {
                  artist: artistLink,
                  contrib: what,
                  links: externalLinks,
                })
              : language.$('misc.artistLink.withContribution', {
                  artist: artistLink,
                  contrib: what,
                }))
          : (hasExternalPart
              ? language.$('misc.artistLink.withExternalLinks', {
                  artist: artistLink,
                  links: externalLinks,
                })
              : language.$('misc.artistLink', {
                  artist: artistLink,
                })))
      );
    }));
}

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
    return [];
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
        thingsUnsorted.every(t => t instanceof Album || t instanceof Track)
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

// Content warning tags

function unbound_getRevealStringFromWarnings(warnings, {
  html,
  language,
}) {
  return (
    language.$('misc.contentWarnings', {warnings}) +
    html.tag('br') +
    html.tag('span', {class: 'reveal-interaction'},
      language.$('misc.contentWarnings.reveal'))
  );
}

function unbound_getRevealStringFromTags(tags, {
  language,

  getRevealStringFromWarnings,
}) {
  return (
    tags?.some(tag => tag.isContentWarning) &&
      getRevealStringFromWarnings(
        language.formatUnitList(
          tags
            .filter(tag => tag.isContentWarning)
            .map(tag => tag.name)))
  );
}

// Cover art links

function unbound_generateCoverLink({
  html,
  img,
  language,
  link,

  getRevealStringFromTags,

  alt,
  path,
  src,
  tags = [],
  to,
  wikiData,
}) {
  const {wikiInfo} = wikiData;

  if (!src && path) {
    src = to(...path);
  }

  if (!src) {
    throw new Error(`Expected src or path`);
  }

  const linkedTags = tags.filter(tag => !tag.isContentWarning);

  return html.tag('div', {id: 'cover-art-container'}, [
    img({
      src,
      alt,
      thumb: 'medium',
      id: 'cover-art',
      link: true,
      square: true,
      reveal: getRevealStringFromTags(tags, {language}),
    }),

    wikiInfo.enableArtTagUI &&
    linkedTags.length &&
      html.tag('p', {class: 'tags'},
        language.$('releaseInfo.artTags.inline', {
          tags: language.formatUnitList(
            linkedTags.map(tag => link.tag(tag))),
        })),
  ]);
}

// CSS & color shenanigans

function unbound_getThemeString(color, {
  getColors,

  additionalVariables = [],
} = {}) {
  if (!color) return '';

  const {
    primary,
    dark,
    dim,
    bg,
    bgBlack,
    shadow,
  } = getColors(color);

  const variables = [
    `--primary-color: ${primary}`,
    `--dark-color: ${dark}`,
    `--dim-color: ${dim}`,
    `--bg-color: ${bg}`,
    `--bg-black-color: ${bgBlack}`,
    `--shadow-color: ${shadow}`,
    ...additionalVariables,
  ].filter(Boolean);

  if (!variables.length) return '';

  return [
    `:root {`,
    ...variables.map((line) => `    ${line};`),
    `}`
  ].join('\n');
}

function unbound_getAlbumStylesheet(album, {
  to,
}) {
  const hasWallpaper = album.wallpaperArtistContribs.length >= 1;
  const hasWallpaperStyle = !!album.wallpaperStyle;
  const hasBannerStyle = !!album.bannerStyle;

  const wallpaperSource =
    (hasWallpaper &&
      to(
        'media.albumWallpaper',
        album.directory,
        album.wallpaperFileExtension));

  const wallpaperPart =
    (hasWallpaper
      ? [
          `body::before {`,
          `    background-image: url("${wallpaperSource}");`,
          ...(hasWallpaperStyle
            ? album.wallpaperStyle
                .split('\n')
                .map(line => `    ${line}`)
            : []),
          `}`,
        ]
      : []);

  const bannerPart =
    (hasBannerStyle
      ? [
          `#banner img {`,
          ...album.bannerStyle
            .split('\n')
            .map(line => `    ${line}`),
          `}`,
        ]
      : []);

  return [
    ...wallpaperPart,
    ...bannerPart,
  ]
    .filter(Boolean)
    .join('\n');
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

// Fancy lookin' links

function unbound_fancifyURL(url, {
  html,
  language,

  album = false,
} = {}) {
  let local = Symbol();
  let domain;
  try {
    domain = new URL(url).hostname;
  } catch (error) {
    // No support for relative local URLs yet, sorry! (I.e, local URLs must
    // be absolute relative to the domain name in order to work.)
    domain = local;
  }

  return html.tag('a',
    {
      href: url,
      class: 'nowrap',
    },

    // truly unhinged indentation here
    domain === local
      ? language.$('misc.external.local')
  : domain.includes('bandcamp.com')
    ? language.$('misc.external.bandcamp')
  : BANDCAMP_DOMAINS.includes(domain)
    ? language.$('misc.external.bandcamp.domain', {domain})
  : MASTODON_DOMAINS.includes(domain)
    ? language.$('misc.external.mastodon.domain', {domain})
  : domain.includes('youtu')
    ? album
      ? url.includes('list=')
        ? language.$('misc.external.youtube.playlist')
        : language.$('misc.external.youtube.fullAlbum')
      : language.$('misc.external.youtube')
  : domain.includes('soundcloud')
    ? language.$('misc.external.soundcloud')
  : domain.includes('tumblr.com')
    ? language.$('misc.external.tumblr')
  : domain.includes('twitter.com')
    ? language.$('misc.external.twitter')
  : domain.includes('deviantart.com')
    ? language.$('misc.external.deviantart')
  : domain.includes('wikipedia.org')
    ? language.$('misc.external.wikipedia')
  : domain.includes('poetryfoundation.org')
    ? language.$('misc.external.poetryFoundation')
  : domain.includes('instagram.com')
    ? language.$('misc.external.instagram')
  : domain.includes('patreon.com')
    ? language.$('misc.external.patreon')
    : domain);
}

function unbound_fancifyFlashURL(url, flash, {
  html,
  language,

  fancifyURL,
}) {
  const link = fancifyURL(url);
  return html.tag('span',
    {class: 'nowrap'},
    url.includes('homestuck.com')
      ? isNaN(Number(flash.page))
        ? language.$('misc.external.flash.homestuck.secret', {link})
        : language.$('misc.external.flash.homestuck.page', {
            link,
            page: flash.page,
          })
  : url.includes('bgreco.net')
    ? language.$('misc.external.flash.bgreco', {link})
  : url.includes('youtu')
    ? language.$('misc.external.flash.youtube', {link})
    : link);
}

function unbound_iconifyURL(url, {
  html,
  language,
  to,
}) {
  const domain = new URL(url).hostname;
  const [id, msg] = (
    domain.includes('bandcamp.com')
      ? ['bandcamp', language.$('misc.external.bandcamp')]
    : BANDCAMP_DOMAINS.includes(domain)
      ? ['bandcamp', language.$('misc.external.bandcamp.domain', {domain})]
    : MASTODON_DOMAINS.includes(domain)
      ? ['mastodon', language.$('misc.external.mastodon.domain', {domain})]
    : domain.includes('youtu')
      ? ['youtube', language.$('misc.external.youtube')]
    : domain.includes('soundcloud')
      ? ['soundcloud', language.$('misc.external.soundcloud')]
    : domain.includes('tumblr.com')
      ? ['tumblr', language.$('misc.external.tumblr')]
    : domain.includes('twitter.com')
      ? ['twitter', language.$('misc.external.twitter')]
    : domain.includes('deviantart.com')
      ? ['deviantart', language.$('misc.external.deviantart')]
    : domain.includes('instagram.com')
      ? ['instagram', language.$('misc.external.bandcamp')]
      : ['globe', language.$('misc.external.domain', {domain})]);

  return html.tag('a',
    {
      href: url,
      class: 'icon',
    },
    html.tag('svg', [
      html.tag('title', msg),
      html.tag('use', {
        href: to('shared.staticFile', `icons.svg#icon-${id}`),
      }),
    ]));
}

// Grids

function unbound_getGridHTML({
  img,
  html,
  language,

  getRevealStringFromTags,

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
            thumb: 'small',
            lazy: typeof lazy === 'number' ? i >= lazy : lazy,
            square: true,
            reveal: getRevealStringFromTags(item.artTags, {language}),
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

  if (!links.length) {
    return '';
  }

  return language.formatUnitList(links);
}

// Footer stuff

function unbound_getFooterLocalizationLinks(pathname, {
  html,
  language,
  to,
  paths,

  defaultLanguage,
  languages,
}) {
  const {toPath} = paths;
  const keySuffix = toPath[0].replace(/^localized\./, '.');
  const toArgs = toPath.slice(1);

  const links = Object.entries(languages)
    .filter(([code, language]) => code !== 'default' && !language.hidden)
    .map(([code, language]) => language)
    .sort(({name: a}, {name: b}) => (a < b ? -1 : a > b ? 1 : 0))
    .map((language) =>
      html.tag(
        'span',
        html.tag(
          'a',
          {
            href:
              language === defaultLanguage
                ? to('localizedDefaultLanguage' + keySuffix, ...toArgs)
                : to(
                    'localizedWithBaseDirectory' + keySuffix,
                    language.code,
                    ...toArgs
                  ),
          },
          language.name
        )
      )
    );

  return html.tag(
    'div',
    {class: 'footer-localization-links'},
    language.$('misc.uiLanguage', {languages: links.join('\n')})
  );
}

// Exports

export {
  unbound_generateAdditionalFilesList as generateAdditionalFilesList,
  unbound_generateAdditionalFilesShortcut as generateAdditionalFilesShortcut,

  unbound_getArtistString as getArtistString,

  unbound_generateChronologyLinks as generateChronologyLinks,

  unbound_getRevealStringFromWarnings as getRevealStringFromWarnings,
  unbound_getRevealStringFromTags as getRevealStringFromTags,

  unbound_generateCoverLink as generateCoverLink,

  unbound_getThemeString as getThemeString,
  unbound_getAlbumStylesheet as getAlbumStylesheet,

  unbound_generateTrackListDividedByGroups as generateTrackListDividedByGroups,

  unbound_fancifyURL as fancifyURL,
  unbound_fancifyFlashURL as fancifyFlashURL,
  unbound_iconifyURL as iconifyURL,

  unbound_getGridHTML as getGridHTML,
  unbound_getAlbumGridHTML as getAlbumGridHTML,
  unbound_getFlashGridHTML as getFlashGridHTML,

  unbound_generateInfoGalleryLinks as generateInfoGalleryLinks,
  unbound_generateNavigationLinks as generateNavigationLinks,

  unbound_getFooterLocalizationLinks as getFooterLocalizationLinks,
}
