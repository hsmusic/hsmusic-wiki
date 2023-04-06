import chroma from 'chroma-js';

import * as html from '../util/html.js';
import {getColors} from '../util/colors.js';

import {
  getFooterLocalizationLinks,
} from '../misc-templates.js';

export function generateDevelopersCommentHTML({
  buildTime,
  commit,
  wikiData,
}) {
  const {name, canonicalBase} = wikiData.wikiInfo;
  return `<!--\n` + [
    canonicalBase
      ? `hsmusic.wiki - ${name}, ${canonicalBase}`
      : `hsmusic.wiki - ${name}`,
    'Code copyright 2019-2023 Quasar Nebula et al (MIT License)',
    ...canonicalBase === 'https://hsmusic.wiki/' ? [
      'Data avidly compiled and localization brought to you',
      'by our awesome team and community of wiki contributors',
      '***',
      'Want to contribute? Join our Discord or leave feedback!',
      '- https://hsmusic.wiki/discord/',
      '- https://hsmusic.wiki/feedback/',
      '- https://github.com/hsmusic/',
    ] : [
      'https://github.com/hsmusic/',
    ],
    '***',
    buildTime &&
      `Site built: ${buildTime.toLocaleString('en-US', {
        dateStyle: 'long',
        timeStyle: 'long',
      })}`,
    commit &&
      `Latest code commit: ${commit}`,
  ]
    .filter(Boolean)
    .map(line => `    ` + line)
    .join('\n') + `\n-->`;
}

export function generateDocumentHTML(pageInfo, {
  cachebust,
  defaultLanguage,
  developersComment,
  generateCoverLink,
  generateStickyHeadingContainer,
  img,
  getThemeString,
  language,
  languages,
  localizedPathnames,
  oEmbedJSONHref,
  pagePath,
  pathname,
  to,
  transformMultiline,
  wikiData,
}) {
  const {wikiInfo} = wikiData;

  let {
    title = '',
    meta = {},
    theme = '',
    stylesheet = '',

    showWikiNameInTitle = true,
    themeColor = '',

    // missing properties are auto-filled, see below!
    body = {},
    banner = {},
    cover = {},
    main = {},
    sidebarLeft = {},
    sidebarRight = {},
    nav = {},
    secondaryNav = {},
    footer = {},
    socialEmbed = {},
  } = pageInfo;

  body ||= {};
  body.style ??= '';

  theme ||= getThemeString(wikiInfo.color);

  banner ||= {};
  banner.classes ??= [];
  banner.src ??= '';
  banner.position ??= '';
  banner.dimensions ??= [0, 0];

  main ||= {};
  main.classes ??= [];
  main.content ??= '';
  main.headingMode ??= 'none';

  cover ||= {};
  cover.src ??= '';
  cover.alt ??= '';
  cover.artTags ??= [];

  sidebarLeft ||= {};
  sidebarRight ||= {};

  for (const sidebar of [sidebarLeft, sidebarRight]) {
    sidebar.classes ??= [];
    sidebar.content ??= '';
    sidebar.collapse ??= true;
  }

  nav ||= {};
  nav.classes ??= [];
  nav.content ??= '';
  nav.bottomRowContent ??= '';
  nav.links ??= [];
  nav.linkContainerClasses ??= [];

  secondaryNav ||= {};
  secondaryNav.content ??= '';
  secondaryNav.content ??= '';

  footer ||= {};
  footer.classes ??= [];
  footer.content ??= wikiInfo.footerContent
    ? transformMultiline(wikiInfo.footerContent)
    : '';

  socialEmbed ||= {};

  const colors = themeColor
    ? getColors(themeColor, {chroma})
    : null;

  const canonical = wikiInfo.canonicalBase
    ? wikiInfo.canonicalBase + (pathname === '/' ? '' : pathname)
    : '';

  const localizedCanonical = wikiInfo.canonicalBase
    ? Object.entries(localizedPathnames).map(([code, pathname]) => ({
        lang: code,
        href: wikiInfo.canonicalBase + (pathname === '/' ? '' : pathname),
      }))
    : [];

  const collapseSidebars =
    sidebarLeft.collapse !== false && sidebarRight.collapse !== false;



  const footerHTML =
    html.tag('footer',
      {
        [html.onlyIfContent]: true,
        id: 'footer',
        class: footer.classes,
      },
      [
        html.tag('div',
          {
            [html.onlyIfContent]: true,
            class: 'footer-content',
          },
          footer.content),

        getFooterLocalizationLinks({
          defaultLanguage,
          html,
          language,
          languages,
          pagePath,
          to,
        }),
      ]);

  const generateSidebarHTML = (id, {
    content,
    multiple,
    classes,
    collapse = true,
    wide = false,

    // 'last' - last or only sidebar box is sticky
    // 'column' - entire column, incl. multiple boxes from top, is sticky
    // 'none' - sidebar not sticky at all, stays at top of page
    stickyMode = 'last',
  }) =>
    content
      ? html.tag('div',
          {
            id,
            class: [
              'sidebar-column',
              'sidebar',
              wide && 'wide',
              !collapse && 'no-hide',
              stickyMode !== 'none' && 'sticky-' + stickyMode,
              ...classes,
            ],
          },
          content)
      : multiple
      ? html.tag('div',
          {
            [html.onlyIfContent]: true,
            id,
            class: [
              'sidebar-column',
              'sidebar-multiple',
              wide && 'wide',
              !collapse && 'no-hide',
              stickyMode !== 'none' && 'sticky-' + stickyMode,
            ],
          },
          multiple
            .filter(Boolean)
            .map((infoOrContent) =>
              (typeof infoOrContent === 'object' && !Array.isArray(infoOrContent))
                ? infoOrContent
                : {content: infoOrContent})
            .filter(({content}) => content)
            .map(({
              content,
              classes: classes2 = [],
            }) =>
              html.tag('div',
                {
                  class: ['sidebar', ...classes, ...classes2],
                },
                html.fragment(content))))
      : '';

  const sidebarLeftHTML = generateSidebarHTML('sidebar-left', sidebarLeft);
  const sidebarRightHTML = generateSidebarHTML('sidebar-right', sidebarRight);

  if (nav.simple) {
    nav.linkContainerClasses = ['nav-links-hierarchy'];
    nav.links = [{toHome: true}, {toCurrentPage: true}];
  }

  const links = (nav.links || []).filter(Boolean);

  const navLinkParts = [];
  for (let i = 0; i < links.length; i++) {
    let cur = links[i];

    let {title: linkTitle} = cur;

    if (cur.toHome) {
      linkTitle ??= wikiInfo.nameShort;
    } else if (cur.toCurrentPage) {
      linkTitle ??= title;
    }

    let partContent;

    if (typeof cur.html === 'string') {
      partContent = cur.html;
    } else {
      const attributes = {
        class: (cur.toCurrentPage || i === links.length - 1) && 'current',
        href: cur.toCurrentPage
          ? ''
          : cur.toHome
          ? to('localized.home')
          : cur.path
          ? to(...cur.path)
          : null,
      };
      if (attributes.href === null) {
        throw new Error(
          `Expected some href specifier for link to ${linkTitle} (${JSON.stringify(
            cur
          )})`
        );
      }
      partContent = html.tag('a', attributes, linkTitle);
    }

    if (!partContent) continue;

    const part = html.tag('span',
      {class: cur.divider === false && 'no-divider'},
      partContent);

    navLinkParts.push(part);
  }

  const navHTML = html.tag('nav',
    {
      [html.onlyIfContent]: true,
      id: 'header',
      class: [
        ...nav.classes,
        links.length && 'nav-has-main-links',
        nav.content && 'nav-has-content',
        nav.bottomRowContent && 'nav-has-bottom-row',
      ],
    },
    [
      links.length &&
        html.tag(
          'div',
          {class: ['nav-main-links', ...nav.linkContainerClasses]},
          navLinkParts
        ),
      nav.bottomRowContent &&
        html.tag('div', {class: 'nav-bottom-row'}, nav.bottomRowContent),
      nav.content && html.tag('div', {class: 'nav-content'}, nav.content),
    ]);

  const secondaryNavHTML = html.tag('nav',
    {
      [html.onlyIfContent]: true,
      id: 'secondary-nav',
      class: secondaryNav.classes,
    },
    secondaryNav.content);

  const bannerSrc = banner.src
    ? banner.src
    : banner.path
    ? to(...banner.path)
    : null;

  const bannerHTML =
    banner.position &&
    bannerSrc &&
    html.tag('div',
      {
        id: 'banner',
        class: banner.classes,
      },
      html.tag('img', {
        src: bannerSrc,
        alt: banner.alt,
        width: banner.dimensions[0] || 1100,
        height: banner.dimensions[1] || 200,
      }));

  const processSkippers = skipperList =>
    skipperList
      .filter(Boolean)
      .map(([href, stringSubkey]) =>
        html.tag('span', {class: 'skipper'},
          html.tag('a',
            {href},
            language.$(`misc.skippers.${stringSubkey}`))));

  // Hilariously jank. Sorry!
  const hasID = id => mainHTML.includes(`id="${id}"`);
  const hasTracks = hasID('tracks');
  const hasArt = hasID('art');
  const hasFlashes = hasID('flashes');
  const hasContributors = hasID('contributors');
  const hasReferences = hasID('references');
  const hasReferencedBy = hasID('referenced-by');
  const hasSamples = hasID('samples');
  const hasSampledBy = hasID('sampled-by');
  const hasFeatures = hasID('features');
  const hasFeaturedIn = hasID('featured-in');
  const hasLyrics = hasID('lyrics');
  const hasSheetMusicFiles = hasID('sheet-music-files');
  const hasMidiProjectFiles = hasID('midi-project-files');
  const hasAdditionalFiles = hasID('additional-files');
  const hasCommentary = hasID('commentary');
  const hasArtistCommentary = hasID('artist-commentary');

  const skippersHTML =
    mainHTML &&
      html.tag('div', {id: 'skippers'}, [
        html.tag('span', language.$('misc.skippers.skipTo')),
        html.tag('div', {class: 'skipper-list'},
          processSkippers([
            ['#content', 'content'],
            sidebarLeftHTML &&
              [
                '#sidebar-left',
                sidebarRightHTML
                  ? 'sidebar.left'
                  : 'sidebar',
              ],
            sidebarRightHTML &&
              [
                '#sidebar-right',
                sidebarLeftHTML
                  ? 'sidebar.right'
                  : 'sidebar',
              ],
            navHTML &&
              ['#header', 'header'],
            footerHTML &&
              ['#footer', 'footer'],
          ])),

        html.tag('div',
          {
            [html.onlyIfContent]: true,
            class: 'skipper-list'
          },
          processSkippers([
            hasTracks &&
              ['#tracks', 'tracks'],
            hasArt &&
              ['#art', 'art'],
            hasFlashes &&
              ['#flashes', 'flashes'],
            hasContributors &&
              ['#contributors', 'contributors'],
            hasReferences &&
              ['#references', 'references'],
            hasReferencedBy &&
              ['#referenced-by', 'referencedBy'],
            hasSamples &&
              ['#samples', 'samples'],
            hasSampledBy &&
              ['#sampled-by', 'sampledBy'],
            hasFeatures &&
              ['#features', 'features'],
            hasFeaturedIn &&
              ['#featured-in', 'featuredIn'],
            hasLyrics &&
              ['#lyrics', 'lyrics'],
            hasSheetMusicFiles &&
              ['#sheet-music-files', 'sheetMusicFiles'],
            hasMidiProjectFiles &&
              ['#midi-project-files', 'midiProjectFiles'],
            hasAdditionalFiles &&
              ['#additional-files', 'additionalFiles'],
            hasCommentary &&
              ['#commentary', 'commentary'],
            hasArtistCommentary &&
              ['#artist-commentary', 'artistCommentary'],
          ])),
      ]);

  const infoCardHTML = html.tag('div', {id: 'info-card-container'},
    html.tag('div', {id: 'info-card-decor'},
      html.tag('div', {id: 'info-card'}, [
        html.tag('div', {class: ['info-card-art-container', 'no-reveal']},
          img({
            class: 'info-card-art',
            src: '',
            link: true,
            square: true,
          })),
        html.tag('div', {class: ['info-card-art-container', 'reveal']},
          img({
            class: 'info-card-art',
            src: '',
            link: true,
            square: true,
            reveal: getRevealStringFromContentWarningMessage(
              html.tag('span', {class: 'info-card-art-warnings'}),
              {html, language}),
          })),
        html.tag('h1', {class: 'info-card-name'},
          html.tag('a')),
        html.tag('p', {class: 'info-card-album'},
          language.$('releaseInfo.from', {
            album: html.tag('a'),
          })),
        html.tag('p', {class: 'info-card-artists'},
          language.$('releaseInfo.by', {
            artists: html.tag('span'),
          })),
        html.tag('p', {class: 'info-card-cover-artists'},
          language.$('releaseInfo.coverArtBy', {
            artists: html.tag('span'),
          })),
      ])));

  const imageOverlayHTML = html.tag('div', {id: 'image-overlay-container'},
    html.tag('div', {id: 'image-overlay-content-container'}, [
      html.tag('a', {id: 'image-overlay-image-container'}, [
        html.tag('img', {id: 'image-overlay-image'}),
        html.tag('img', {id: 'image-overlay-image-thumb'}),
      ]),
      html.tag('div', {id: 'image-overlay-action-container'}, [
        html.tag('div', {id: 'image-overlay-action-content-without-size'},
          language.$('releaseInfo.viewOriginalFile', {
            link: html.tag('a', {class: 'image-overlay-view-original'},
              language.$('releaseInfo.viewOriginalFile.link')),
          })),

        html.tag('div', {id: 'image-overlay-action-content-with-size'}, [
          language.$('releaseInfo.viewOriginalFile.withSize', {
            link: html.tag('a', {class: 'image-overlay-view-original'},
              language.$('releaseInfo.viewOriginalFile.link')),
            size: html.tag('span',
              {[html.joinChildren]: ''},
              [
                html.tag('span', {id: 'image-overlay-file-size-kilobytes'},
                  language.$('count.fileSize.kilobytes', {
                    kilobytes: html.tag('span', {class: 'image-overlay-file-size-count'}),
                  })),
                html.tag('span', {id: 'image-overlay-file-size-megabytes'},
                  language.$('count.fileSize.megabytes', {
                    megabytes: html.tag('span', {class: 'image-overlay-file-size-count'}),
                  })),
              ]),
          }),

          html.tag('span', {id: 'image-overlay-file-size-warning'},
            language.$('releaseInfo.viewOriginalFile.sizeWarning')),
        ]),
      ]),
    ]));

  const socialEmbedHTML = [
    socialEmbed.title &&
      html.tag('meta', {property: 'og:title', content: socialEmbed.title}),

    socialEmbed.description &&
      html.tag('meta', {
        property: 'og:description',
        content: socialEmbed.description,
      }),

    socialEmbed.image &&
      html.tag('meta', {property: 'og:image', content: socialEmbed.image}),

    ...html.fragment(
      colors && [
        html.tag('meta', {
          name: 'theme-color',
          content: colors.dark,
          media: '(prefers-color-scheme: dark)',
        }),

        html.tag('meta', {
          name: 'theme-color',
          content: colors.light,
          media: '(prefers-color-scheme: light)',
        }),

        html.tag('meta', {
          name: 'theme-color',
          content: colors.primary,
        }),
      ]),

    oEmbedJSONHref &&
      html.tag('link', {
        type: 'application/json+oembed',
        href: oEmbedJSONHref,
      }),
  ].filter(Boolean).join('\n');

  return `<!DOCTYPE html>\n`
}

export function generateOEmbedJSON(pageInfo, {language, wikiData}) {
  const {socialEmbed} = pageInfo;
  const {wikiInfo} = wikiData;
  const {canonicalBase, nameShort} = wikiInfo;

  if (!socialEmbed) return '';

  const entries = [
    socialEmbed.heading && [
      'author_name',
      language.$('misc.socialEmbed.heading', {
        wikiName: nameShort,
        heading: socialEmbed.heading,
      }),
    ],
    socialEmbed.headingLink &&
      canonicalBase && [
        'author_url',
        canonicalBase.replace(/\/$/, '') +
          '/' +
          socialEmbed.headingLink.replace(/^\//, ''),
      ],
  ].filter(Boolean);

  if (!entries.length) return '';

  return JSON.stringify(Object.fromEntries(entries));
}

export function generateRedirectHTML(title, target, {
  language,
}) {
  return `<!DOCTYPE html>\n` + html.tag('html', [
    html.tag('head', [
      html.tag('title', language.$('redirectPage.title', {title})),
      html.tag('meta', {charset: 'utf-8'}),

      html.tag('meta', {
        'http-equiv': 'refresh',
        content: `0;url=${target}`,
      }),

      // TODO: Is this OK for localized pages?
      html.tag('link', {
        rel: 'canonical',
        href: target,
      }),
    ]),

    html.tag('body',
      html.tag('main', [
        html.tag('h1',
          language.$('redirectPage.title', {title})),
        html.tag('p',
          language.$('redirectPage.infoLine', {
            target: html.tag('a', {href: target}, target),
          })),
      ])),
  ]);
}

export function generateGlobalWikiDataJSON({
  serializeThings,
  wikiData,
}) {
  return '{\n' +
    ([
      `"albumData": ${stringifyThings(wikiData.albumData)},`,
      wikiData.wikiInfo.enableFlashesAndGames &&
        `"flashData": ${stringifyThings(wikiData.flashData)},`,
      `"artistData": ${stringifyThings(wikiData.artistData)}`,
    ]
      .filter(Boolean)
      .map(line => '  ' + line)
      .join('\n')) +
    '\n}';

  function stringifyThings(thingData) {
    return JSON.stringify(serializeThings(thingData));
  }
}
