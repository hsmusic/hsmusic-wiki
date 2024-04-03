import {openAggregate} from '#aggregate';
import {empty} from '#sugar';

function sidebarSlots(side) {
  return {
    // Content is a flat HTML array. It'll generate one sidebar section
    // if specified.
    [side + 'Content']: {
      type: 'html',
      mutable: false,
    },

    // A single class to apply to the whole sidebar. If specifying multiple
    // sections, this be added to the containing sidebar-column - specify a
    // class on each section if that's more suitable.
    [side + 'Class']: {type: 'string'},

    // Multiple is an array of objects, each specifying content (HTML) and
    // optionally class (a string). Each of these will generate one sidebar
    // section.
    [side + 'Multiple']: {
      validate: v =>
        v.sparseArrayOf(
          v.validateProperties({
            class: v.optional(v.isString),
            content: v.isHTML,
          })),
    },

    // Sticky mode controls which sidebar section(s), if any, follow the
    // scroll position, "sticking" to the top of the browser viewport.
    //
    // 'last' - last or only sidebar box is sticky
    // 'column' - entire column, incl. multiple boxes from top, is sticky
    // 'none' - sidebar not sticky at all, stays at top of page
    //
    // Note: This doesn't affect the content of any sidebar section, only
    // the whole section's containing box (or the sidebar column as a whole).
    [side + 'StickyMode']: {
      validate: v => v.is('last', 'column', 'static'),
      default: 'static',
    },

    // Collapsing sidebars disappear when the viewport is sufficiently
    // thin. (This is the default.) Override as false to make the sidebar
    // stay visible in thinner viewports, where the page layout will be
    // reflowed so the sidebar is as wide as the screen and appears below
    // nav, above the main content.
    [side + 'Collapse']: {type: 'boolean', default: true},

    // Wide sidebars generally take up more horizontal space in the normal
    // page layout, and should be used if the content of the sidebar has
    // a greater than typical focus compared to main content.
    [side + 'Wide']: {type: 'boolean', defualt: false},
  };
}

export default {
  contentDependencies: [
    'generateColorStyleRules',
    'generateFooterLocalizationLinks',
    'generateStickyHeadingContainer',
    'transformContent',
  ],

  extraDependencies: [
    'cachebust',
    'getColors',
    'html',
    'language',
    'pagePath',
    'to',
    'wikiData',
  ],

  sprawl({wikiInfo}) {
    return {
      footerContent: wikiInfo.footerContent,
      wikiColor: wikiInfo.color,
      wikiName: wikiInfo.nameShort,
    };
  },

  data({wikiColor, wikiName}) {
    return {
      wikiColor,
      wikiName,
    };
  },

  relations(relation, sprawl) {
    const relations = {};

    relations.footerLocalizationLinks =
      relation('generateFooterLocalizationLinks');

    relations.stickyHeadingContainer =
      relation('generateStickyHeadingContainer');

    if (sprawl.footerContent) {
      relations.defaultFooterContent =
        relation('transformContent', sprawl.footerContent);
    }

    relations.colorStyleRules =
      relation('generateColorStyleRules');

    return relations;
  },

  slots: {
    title: {
      type: 'html',
      mutable: false,
    },

    showWikiNameInTitle: {
      type: 'boolean',
      default: true,
    },

    additionalNames: {
      type: 'html',
      mutable: false,
    },

    cover: {
      type: 'html',
      mutable: false,
    },

    // Strictly speaking we clone this each time we use it, so it doesn't
    // need to be marked as mutable here.
    socialEmbed: {
      type: 'html',
      mutable: true,
    },

    color: {validate: v => v.isColor},

    styleRules: {
      validate: v => v.sparseArrayOf(v.isHTML),
      default: [],
    },

    mainClasses: {
      validate: v => v.sparseArrayOf(v.isString),
      default: [],
    },

    // Main

    mainContent: {
      type: 'html',
      mutable: false,
    },

    headingMode: {
      validate: v => v.is('sticky', 'static'),
      default: 'static',
    },

    // Sidebars

    ...sidebarSlots('leftSidebar'),
    ...sidebarSlots('rightSidebar'),

    // Banner

    banner: {
      type: 'html',
      mutable: false,
    },

    bannerPosition: {
      validate: v => v.is('top', 'bottom'),
      default: 'top',
    },

    // Nav & Footer

    navContent: {
      type: 'html',
      mutable: false,
    },

    navBottomRowContent: {
      type: 'html',
      mutable: false,
    },

    navLinkStyle: {
      validate: v => v.is('hierarchical', 'index'),
      default: 'index',
    },

    navLinks: {
      validate: v =>
        v.sparseArrayOf(object => {
          v.isObject(object);

          const aggregate = openAggregate({message: `Errors validating navigation link`});

          aggregate.call(v.validateProperties({
            auto: () => true,
            html: () => true,

            path: () => true,
            title: () => true,
            accent: () => true,

            current: () => true,
          }), object);

          if (object.current !== undefined) {
            aggregate.call(v.isBoolean, object.current);
          }

          if (object.auto || object.html) {
            if (object.auto && object.html) {
              aggregate.push(new TypeError(`Don't specify both auto and html`));
            } else if (object.auto) {
              aggregate.call(v.is('home', 'current'), object.auto);
            } else {
              aggregate.call(v.isHTML, object.html);
            }

            if (object.path || object.title) {
              aggregate.push(new TypeError(`Don't specify path or title along with auto or html`));
            }
          } else {
            aggregate.call(v.validateProperties({
              path: v.strictArrayOf(v.isString),
              title: v.isHTML,
            }), {
              path: object.path,
              title: object.title,
            });
          }

          aggregate.close();

          return true;
        })
    },

    secondaryNav: {
      type: 'html',
      mutable: false,
    },

    footerContent: {
      type: 'html',
      mutable: false,
    },
  },

  generate(data, relations, slots, {
    cachebust,
    getColors,
    html,
    language,
    pagePath,
    to,
  }) {
    const colors = getColors(slots.color ?? data.wikiColor);
    const hasSocialEmbed = !html.isBlank(slots.socialEmbed);

    const titleContentsHTML =
      (html.isBlank(slots.title)
        ? null
     : html.isBlank(slots.additionalNames)
        ? language.sanitize(slots.title)
        : html.tag('a', {
            href: '#additional-names-box',
            title: language.$('misc.additionalNames.tooltip').toString(),
          }, language.sanitize(slots.title)));

    const titleHTML =
      (html.isBlank(slots.title)
        ? null
     : slots.headingMode === 'sticky'
        ? relations.stickyHeadingContainer.slots({
            title: titleContentsHTML,
            cover: slots.cover,
          })
        : html.tag('h1', titleContentsHTML));

    let footerContent = slots.footerContent;

    if (html.isBlank(footerContent) && relations.defaultFooterContent) {
      footerContent =
        relations.defaultFooterContent.slots({
          mode: 'multiline',
          indicateExternalLinks: false,
        });
    }

    const mainHTML =
      html.tag('main', {id: 'content'},
        {class: slots.mainClasses},

        [
          titleHTML,

          html.tag('div', {id: 'cover-art-container'},
            {[html.onlyIfContent]: true},
            slots.cover),

          slots.additionalNames,

          html.tag('div', {class: 'main-content-container'},
            {[html.onlyIfContent]: true},
            slots.mainContent),
        ]);

    const footerHTML =
      html.tag('footer', {id: 'footer'},
        {[html.onlyIfContent]: true},

        [
          html.tag('div', {class: 'footer-content'},
            {[html.onlyIfContent]: true},
            footerContent),

          relations.footerLocalizationLinks,
        ]);

    const navHTML =
      html.tag('nav', {id: 'header'},
        {[html.onlyIfContent]: true},

        !empty(slots.navLinks) &&
          {class: 'nav-has-main-links'},

        !html.isBlank(slots.navContent) &&
          {class: 'nav-has-content'},

        !html.isBlank(slots.navBottomRowContent) &&
          {class: 'nav-has-bottom-row'},

        [
          html.tag('div', {class: 'nav-main-links'},
            {[html.onlyIfContent]: true},
            {class: 'nav-links-' + slots.navLinkStyle},

            slots.navLinks
              ?.filter(Boolean)
              ?.map((cur, i) => {
                let content;

                if (cur.html) {
                  content = cur.html;
                } else {
                  let title;
                  let href;

                  switch (cur.auto) {
                    case 'home':
                      title = data.wikiName;
                      href = to('localized.home');
                      break;
                    case 'current':
                      title = slots.title;
                      href = '';
                      break;
                    case null:
                    case undefined:
                      title = cur.title;
                      href = to(...cur.path);
                      break;
                  }

                  content = html.tag('a',
                    {href},
                    title);
                }

                const showAsCurrent =
                  cur.current ||
                  cur.auto === 'current' ||
                  (slots.navLinkStyle === 'hierarchical' &&
                    i === slots.navLinks.length - 1);

                return (
                  html.tag('span', {class: 'nav-link'},
                    showAsCurrent &&
                      {class: 'current'},

                    i > 0 &&
                      {class: 'has-divider'},

                    [
                      html.tag('span', {class: 'nav-link-content'},
                        // Use inline-block styling on the content span,
                        // rather than wrapping the whole nav-link in a proper
                        // blockwrap, so that if the content spans multiple
                        // lines, it'll kick the accent down beneath it.
                        i > 0 &&
                          {class: 'blockwrap'},

                        content),

                      html.tag('span', {class: 'nav-link-accent'},
                        {[html.onlyIfContent]: true},
                        cur.accent),
                    ]));
              })),

          html.tag('div', {class: 'nav-bottom-row'},
            {[html.onlyIfContent]: true},
            slots.navBottomRowContent),

          html.tag('div', {class: 'nav-content'},
            {[html.onlyIfContent]: true},
            slots.navContent),
        ]);

    const generateSidebarHTML = (side, id) => {
      const attributes = html.attributes({
        class: 'sidebar-column',
        id,
      });

      const topClass = slots[side + 'Class'];
      if (topClass) {
        attributes.add('class', topClass);
      }

      if (slots[side + 'Wide']) {
        attributes.add('class', 'wide');
      }

      if (!slots[side + 'Collapse']) {
        attributes.add('class', 'no-hide');
      }

      const stickyMode = slots[side + 'StickyMode'];
      if (stickyMode !== 'static') {
        attributes.add('class', `sticky-${stickyMode}`);
      }

      let content = slots[side + 'Content'];

      if (html.isBlank(content)) {
        if (!slots[side + 'Multiple']) {
          return html.blank();
        }

        const multiple =
          slots[side + 'Multiple'].filter(Boolean);

        if (empty(multiple)) {
          return html.blank();
        }

        attributes.add('class', 'sidebar-multiple');
        content =
          multiple.map(box =>
            html.tag('div', {class: 'sidebar'},
              {class: box.class},
              box.content));
      } else {
        attributes.add('class', 'sidebar');
      }

      return html.tag('div', attributes, content);
    }

    const sidebarLeftHTML = generateSidebarHTML('leftSidebar', 'sidebar-left');
    const sidebarRightHTML = generateSidebarHTML('rightSidebar', 'sidebar-right');

    const hasSidebarLeft = !html.isBlank(sidebarLeftHTML);
    const hasSidebarRight = !html.isBlank(sidebarRightHTML);

    const collapseSidebars = slots.leftSidebarCollapse && slots.rightSidebarCollapse;

    const hasID = (() => {
      // Hilariously jank. Sorry!
      const mainContentHTML = slots.mainContent.toString();
      return id => mainContentHTML.includes(`id="${id}"`);
    })();

    const processSkippers = skipperList =>
      skipperList
        .filter(({condition, id}) =>
          (condition === undefined
            ? hasID(id)
            : condition))
        .map(({id, string}) =>
          html.tag('span', {class: 'skipper'},
            html.tag('a',
              {href: `#${id}`},
              language.$('misc.skippers', string))));

    const skippersHTML =
      mainHTML &&
        html.tag('div', {id: 'skippers'}, [
          html.tag('span', language.$('misc.skippers.skipTo')),
          html.tag('div', {class: 'skipper-list'},
            processSkippers([
              {condition: true, id: 'content', string: 'content'},
              {
                condition: hasSidebarLeft,
                id: 'sidebar-left',
                string:
                  (hasSidebarRight
                    ? 'sidebar.left'
                    : 'sidebar'),
              },
              {
                condition: hasSidebarRight,
                id: 'sidebar-right',
                string:
                  (hasSidebarLeft
                    ? 'sidebar.right'
                    : 'sidebar'),
              },
              {condition: navHTML, id: 'header', string: 'header'},
              {condition: footerHTML, id: 'footer', string: 'footer'},
            ])),

          html.tag('div', {class: 'skipper-list'},
            {[html.onlyIfContent]: true},
            processSkippers([
              {id: 'tracks', string: 'tracks'},
              {id: 'art', string: 'artworks'},
              {id: 'flashes', string: 'flashes'},
              {id: 'contributors', string: 'contributors'},
              {id: 'references', string: 'references'},
              {id: 'referenced-by', string: 'referencedBy'},
              {id: 'samples', string: 'samples'},
              {id: 'sampled-by', string: 'sampledBy'},
              {id: 'features', string: 'features'},
              {id: 'featured-in', string: 'featuredIn'},
              {id: 'sheet-music-files', string: 'sheetMusicFiles'},
              {id: 'midi-project-files', string: 'midiProjectFiles'},
              {id: 'additional-files', string: 'additionalFiles'},
              {id: 'commentary', string: 'commentary'},
              {id: 'artist-commentary', string: 'artistCommentary'},
            ])),
        ]);

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
              link:
                html.tag('a', {class: 'image-overlay-view-original'},
                  language.$('releaseInfo.viewOriginalFile.link')),

              size:
                html.tag('span',
                  {[html.joinChildren]: ''},
                  [
                    html.tag('span', {id: 'image-overlay-file-size-kilobytes'},
                      language.$('count.fileSize.kilobytes', {
                        kilobytes:
                          html.tag('span', {class: 'image-overlay-file-size-count'}),
                      })),

                    html.tag('span', {id: 'image-overlay-file-size-megabytes'},
                      language.$('count.fileSize.megabytes', {
                        megabytes:
                          html.tag('span', {class: 'image-overlay-file-size-count'}),
                      })),
                  ]),
            }),

            html.tag('span', {id: 'image-overlay-file-size-warning'},
              language.$('releaseInfo.viewOriginalFile.sizeWarning')),
          ]),
        ]),
      ]));

    const layoutHTML = [
      navHTML,

      slots.bannerPosition === 'top' &&
        slots.banner,

      slots.secondaryNav,

      html.tag('div', {class: 'layout-columns'},
        !collapseSidebars &&
          {class: 'vertical-when-thin'},

        [
          sidebarLeftHTML,
          mainHTML,
          sidebarRightHTML,
        ]),

      slots.bannerPosition === 'bottom' &&
        slots.banner,

      footerHTML,
    ];

    const pageHTML = html.tags([
      `<!DOCTYPE html>`,
      html.tag('html',
        {lang: language.intlCode},
        {'data-language-code': language.code},

        {'data-url-key': 'localized.' + pagePath[0]},
        Object.fromEntries(
          pagePath
            .slice(1)
            .map((v, i) => [['data-url-value' + i], v])),

        {'data-rebase-localized': to('localized.root')},
        {'data-rebase-shared': to('shared.root')},
        {'data-rebase-media': to('media.root')},
        {'data-rebase-data': to('data.root')},

        [
          // developersComment,

          html.tag('head', [
            html.tag('title',
              (slots.showWikiNameInTitle
                ? language.formatString('misc.pageTitle.withWikiName', {
                    title: slots.title,
                    wikiName: data.wikiName,
                  })
                : language.formatString('misc.pageTitle', {
                    title: slots.title,
                  }))),

            html.tag('meta', {charset: 'utf-8'}),
            html.tag('meta', {
              name: 'viewport',
              content: 'width=device-width, initial-scale=1',
            }),

            slots.color && [
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
            ],

            /*
            ...(
              Object.entries(meta)
                .filter(([key, value]) => value)
                .map(([key, value]) => html.tag('meta', {[key]: value}))),

            canonical &&
              html.tag('link', {
                rel: 'canonical',
                href: canonical,
              }),

            ...(
              localizedCanonical
                .map(({lang, href}) => html.tag('link', {
                  rel: 'alternate',
                  hreflang: lang,
                  href,
                }))),

            */

            hasSocialEmbed &&
              slots.socialEmbed
                .clone()
                .slot('mode', 'html'),

            html.tag('link', {
              rel: 'stylesheet',
              href: to('shared.staticFile', 'site6.css', cachebust),
            }),

            html.tag('style', [
              relations.colorStyleRules
                .slot('color', slots.color ?? data.wikiColor),
              slots.styleRules,
            ]),

            html.tag('script', {
              src: to('shared.staticFile', 'lazy-loading.js', cachebust),
            }),
          ]),

          html.tag('body',
            [
              html.tag('div', {id: 'page-container'},
                (hasSidebarLeft || hasSidebarRight
                  ? {class: 'has-one-sidebar'}
                  : {class: 'has-zero-sidebars'}),

                hasSidebarLeft && hasSidebarRight &&
                  {class: 'has-two-sidebars'},

                hasSidebarLeft &&
                  {class: 'has-sidebar-left'},

                hasSidebarRight &&
                  {class: 'has-sidebar-right'},

                [
                  skippersHTML,
                  layoutHTML,
                ]),

              // infoCardHTML,
              imageOverlayHTML,

              html.tag('script', {
                type: 'module',
                src: to('shared.staticFile', 'client3.js', cachebust),
              }),
            ]),
        ])
    ]).toString();

    const oEmbedJSON =
      (hasSocialEmbed
        ? slots.socialEmbed
            .clone()
            .slot('mode', 'json')
            .content
        : null);

    return {pageHTML, oEmbedJSON};
  },
};
