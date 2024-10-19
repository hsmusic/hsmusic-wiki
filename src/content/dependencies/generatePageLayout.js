import {openAggregate} from '#aggregate';
import {empty} from '#sugar';

export default {
  contentDependencies: [
    'generateColorStyleRules',
    'generateFooterLocalizationLinks',
    'generatePageSidebar',
    'generateSearchSidebarBox',
    'generateStickyHeadingContainer',
    'transformContent',
  ],

  extraDependencies: [
    'getColors',
    'html',
    'language',
    'pagePath',
    'pagePathStringFromRoot',
    'to',
    'wikiData',
  ],

  sprawl: ({wikiInfo}) => ({
    enableSearch: wikiInfo.enableSearch,
    footerContent: wikiInfo.footerContent,
    wikiColor: wikiInfo.color,
    wikiName: wikiInfo.nameShort,
    canonicalBase: wikiInfo.canonicalBase,
  }),

  data: (sprawl) => ({
    wikiColor: sprawl.wikiColor,
    wikiName: sprawl.wikiName,
    canonicalBase: sprawl.canonicalBase,
  }),

  relations(relation, sprawl) {
    const relations = {};

    relations.footerLocalizationLinks =
      relation('generateFooterLocalizationLinks');

    relations.stickyHeadingContainer =
      relation('generateStickyHeadingContainer');

    relations.sidebar =
      relation('generatePageSidebar');

    if (sprawl.enableSearch) {
      relations.searchBox =
        relation('generateSearchSidebarBox');
    }

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

    showSearch: {
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

    leftSidebar: {
      type: 'html',
      mutable: true,
    },

    rightSidebar: {
      type: 'html',
      mutable: true,
    },

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
    getColors,
    html,
    language,
    pagePath,
    pagePathStringFromRoot,
    to,
  }) {
    const colors = getColors(slots.color ?? data.wikiColor);
    const hasSocialEmbed = !html.isBlank(slots.socialEmbed);

    // Hilariously jank. Sorry! We're going to need this content later ANYWAY,
    // so it's "fine" to stringify it here, but this DOES mean that we're
    // stringifying (and resolving) the content without the context that it's
    // e.g. going to end up in a page HTML hierarchy. Might have implications
    // later, mainly for: https://github.com/hsmusic/hsmusic-wiki/issues/434
    const mainContentHTML = html.tags([slots.mainContent]).toString();
    const hasID = id => mainContentHTML.includes(`id="${id}"`);

    const oEmbedJSONHref =
      (hasSocialEmbed && data.canonicalBase
        ? data.canonicalBase +
          pagePathStringFromRoot +
          'oembed.json'
        : null);

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
            mainContentHTML),
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
                  const attributes = html.attributes();
                  let title;

                  switch (cur.auto) {
                    case 'home':
                      title = data.wikiName;
                      attributes.set('href', to('localized.home'));
                      break;
                    case 'current':
                      title = slots.title;
                      attributes.set('href', '');
                      break;
                    case null:
                    case undefined:
                      title = cur.title;
                      attributes.set('href', to(...cur.path));
                      break;
                  }

                  content = html.tag('a', attributes, title);
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
                        {[html.noEdgeWhitespace]: true},
                        {[html.onlyIfContent]: true},

                        language.$('misc.navAccent', {
                          [language.onlyIfOptions]: ['links'],
                          links: cur.accent,
                        })),
                    ]));
              })),

          html.tag('div', {class: 'nav-bottom-row'},
            {[html.onlyIfContent]: true},

            language.$('misc.navAccent', {
              [language.onlyIfOptions]: ['links'],
              links: slots.navBottomRowContent,
            })),

          html.tag('div', {class: 'nav-content'},
            {[html.onlyIfContent]: true},
            slots.navContent),
        ]);

    const getSidebar = (side, id, needed) => {
      const sidebar =
        (html.isBlank(slots[side])
          ? (needed
              ? relations.sidebar.clone()
              : html.blank())
          : slots[side]);

      if (html.isBlank(sidebar) && !needed) {
        return sidebar;
      }

      return sidebar.slots({
        attributes:
          sidebar
            .getSlotValue('attributes')
            .with({id}),
      });
    }

    const willShowSearch =
      slots.showSearch && relations.searchBox;

    let showingSidebarLeft;
    let showingSidebarRight;

    const leftSidebar = getSidebar('leftSidebar', 'sidebar-left', willShowSearch);
    const rightSidebar = getSidebar('rightSidebar', 'sidebar-right', false);

    if (willShowSearch) {
      if (html.isBlank(leftSidebar)) {
        leftSidebar.setSlot('initiallyHidden', true);
        showingSidebarLeft = false;
      }

      leftSidebar.setSlot(
        'boxes',
        html.tags([
          relations.searchBox,
          leftSidebar.getSlotValue('boxes'),
        ]));
    }

    const hasSidebarLeft = !html.isBlank(html.resolve(leftSidebar));
    const hasSidebarRight = !html.isBlank(html.resolve(rightSidebar));

    showingSidebarLeft ??= hasSidebarLeft;
    showingSidebarRight ??= hasSidebarRight;

    const processSkippers = skipperList =>
      skipperList
        .filter(({condition, id}) =>
          (condition === undefined
            ? hasID(id)
            : condition))

        .map(({id, string}) =>
          html.tag('span', {class: 'skipper'},
            {'data-for': id},

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
              {id: 'credit-sources', string: 'creditSources'},
            ])),
        ]);

    const imageOverlayHTML = html.tag('div', {id: 'image-overlay-container'},
      html.tag('div', {id: 'image-overlay-content-container'}, [
        html.tag('a', {id: 'image-overlay-image-container'}, [
          html.tag('img', {id: 'image-overlay-image'}),
          html.tag('img', {id: 'image-overlay-image-thumb'}),
        ]),

        html.tag('div', {id: 'image-overlay-action-container'},
          language.encapsulate('releaseInfo.viewOriginalFile', capsule => [
            html.tag('div', {id: 'image-overlay-action-content-without-size'},
              language.$(capsule, {
                link: html.tag('a', {class: 'image-overlay-view-original'},
                  language.$(capsule, 'link')),
              })),

            html.tag('div', {id: 'image-overlay-action-content-with-size'}, [
              language.$(capsule, 'withSize', {
                link:
                  html.tag('a', {class: 'image-overlay-view-original'},
                    language.$(capsule, 'link')),

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
                language.$(capsule, 'sizeWarning')),
            ]),
          ])),
      ]));

    const layoutHTML = [
      navHTML,

      slots.bannerPosition === 'top' &&
        slots.banner,

      slots.secondaryNav,

      html.tag('div', {class: 'layout-columns'}, [
        leftSidebar,
        mainHTML,
        rightSidebar,
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
        {'data-rebase-thumb': to('thumb.root')},
        {'data-rebase-lib': to('staticLib.root')},
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

            oEmbedJSONHref &&
              html.tag('link', {
                type: 'application/json+oembed',
                href: oEmbedJSONHref,
              }),

            html.tag('link', {
              rel: 'stylesheet',
              href: to('staticCSS.path', 'site.css'),
            }),

            html.tag('style', [
              relations.colorStyleRules
                .slot('color', slots.color ?? data.wikiColor),
              slots.styleRules,
            ]),

            html.tag('script', {
              src: to('staticLib.path', 'chroma-js/chroma.min.js'),
            }),

            html.tag('script', {
              blocking: 'render',
              src: to('staticJS.path', 'lazy-loading.js'),
            }),

            html.tag('script', {
              blocking: 'render',
              type: 'module',
              src: to('staticJS.path', 'client/index.js'),
            }),
          ]),

          html.tag('body',
            [
              html.tag('div', {id: 'page-container'},
                showingSidebarLeft &&
                  {class: 'showing-sidebar-left'},

                showingSidebarRight &&
                  {class: 'showing-sidebar-right'},

                [
                  skippersHTML,
                  layoutHTML,
                ]),

              // infoCardHTML,
              imageOverlayHTML,
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
