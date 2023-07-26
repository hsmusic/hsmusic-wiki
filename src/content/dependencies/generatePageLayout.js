import {empty, openAggregate} from '../../util/sugar.js';

function sidebarSlots(side) {
  return {
    // Content is a flat HTML array. It'll generate one sidebar section
    // if specified.
    [side + 'Content']: {type: 'html'},

    // Multiple is an array of {content: (HTML)} objects. Each of these
    // will generate one sidebar section.
    [side + 'Multiple']: {
      validate: v =>
        v.sparseArrayOf(
          v.validateProperties({
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
    'html',
    'language',
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

  data({wikiName}) {
    return {
      wikiName,
    };
  },

  relations(relation, sprawl) {
    const relations = {};

    relations.footerLocalizationLinks =
      relation('generateFooterLocalizationLinks');

    relations.stickyHeadingContainer =
      relation('generateStickyHeadingContainer');

    relations.defaultFooterContent =
      relation('transformContent', sprawl.footerContent);

    relations.defaultColorStyleRules =
      relation('generateColorStyleRules', sprawl.wikiColor);

    return relations;
  },

  slots: {
    title: {type: 'html'},
    showWikiNameInTitle: {type: 'boolean', default: true},

    cover: {type: 'html'},

    socialEmbed: {type: 'html'},

    colorStyleRules: {
      validate: v => v.sparseArrayOf(v.isString),
      default: [],
    },

    additionalStyleRules: {
      validate: v => v.sparseArrayOf(v.isString),
      default: [],
    },

    mainClasses: {
      validate: v => v.sparseArrayOf(v.isString),
      default: [],
    },

    // Main

    mainContent: {type: 'html'},

    headingMode: {
      validate: v => v.is('sticky', 'static'),
      default: 'static',
    },

    // Sidebars

    ...sidebarSlots('leftSidebar'),
    ...sidebarSlots('rightSidebar'),

    // Banner

    banner: {type: 'html'},
    bannerPosition: {
      validate: v => v.is('top', 'bottom'),
      default: 'top',
    },

    // Nav & Footer

    navContent: {type: 'html'},
    navBottomRowContent: {type: 'html'},

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
              title: v.isString,
            }), {
              path: object.path,
              title: object.title,
            });
          }

          aggregate.close();

          return true;
        })
    },

    secondaryNav: {type: 'html'},

    footerContent: {type: 'html'},
  },

  generate(data, relations, slots, {
    cachebust,
    html,
    language,
    to,
  }) {
    let titleHTML = null;

    if (!html.isBlank(slots.title)) {
      switch (slots.headingMode) {
        case 'sticky':
          titleHTML =
            relations.stickyHeadingContainer.slots({
              title: slots.title,
              cover: slots.cover,
            });
          break;
        case 'static':
          titleHTML = html.tag('h1', slots.title);
          break;
      }
    }

    let footerContent = slots.footerContent;

    if (html.isBlank(footerContent)) {
      footerContent = relations.defaultFooterContent
        .slot('mode', 'multiline');
    }

    const mainHTML =
      html.tag('main', {
        id: 'content',
        class: slots.mainClasses,
      }, [
        titleHTML,

        slots.cover,

        html.tag('div',
          {
            [html.onlyIfContent]: true,
            class: 'main-content-container',
          },
          slots.mainContent),
      ]);

    const footerHTML =
      html.tag('footer',
        {[html.onlyIfContent]: true, id: 'footer'},
        [
          html.tag('div',
            {
              [html.onlyIfContent]: true,
              class: 'footer-content',
            },
            footerContent),

          relations.footerLocalizationLinks,
        ]);

    const navHTML = html.tag('nav',
      {
        [html.onlyIfContent]: true,
        id: 'header',
        class: [
          !empty(slots.navLinks) && 'nav-has-main-links',
          !html.isBlank(slots.navContent) && 'nav-has-content',
          !html.isBlank(slots.navBottomRowContent) && 'nav-has-bottom-row',
        ],
      },
      [
        html.tag('div',
          {
            [html.onlyIfContent]: true,
            class: [
              'nav-main-links',
              'nav-links-' + slots.navLinkStyle,
            ],
          },
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

              let className;

              if (
                cur.current ||
                cur.auto === 'current' ||
                (slots.navLinkStyle === 'hierarchical' &&
                  i === slots.navLinks.length - 1)
              ) {
                className = 'current';
              }

              return html.tag('span',
                {class: className},
                [
                  html.tag('span',
                    {class: 'nav-link-content'},
                    content),
                  html.tag('span',
                    {[html.onlyIfContent]: true, class: 'nav-link-accent'},
                    cur.accent),
                ]);
            })),

        html.tag('div',
          {[html.onlyIfContent]: true, class: 'nav-bottom-row'},
          slots.navBottomRowContent),

        html.tag('div',
          {[html.onlyIfContent]: true, class: 'nav-content'},
          slots.navContent),
      ])

    const generateSidebarHTML = (side, id) => {
      const content = slots[side + 'Content'];
      const multiple = slots[side + 'Multiple'];
      const stickyMode = slots[side + 'StickyMode'];
      const wide = slots[side + 'Wide'];
      const collapse = slots[side + 'Collapse'];

      let sidebarClasses = [];
      let sidebarContent = html.blank();

      if (!html.isBlank(content)) {
        sidebarClasses = ['sidebar'];
        sidebarContent = content;
      } else if (multiple) {
        sidebarClasses = ['sidebar-multiple'];
        sidebarContent =
          multiple
            .filter(Boolean)
            .map(({content}) =>
              html.tag('div',
                {
                  [html.onlyIfContent]: true,
                  class: 'sidebar',
                },
                content));
      }

      return html.tag('div',
        {
          [html.onlyIfContent]: true,
          id,
          class: [
            'sidebar-column',
            wide && 'wide',
            !collapse && 'no-hide',
            stickyMode !== 'static' && `sticky-${stickyMode}`,
            ...sidebarClasses,
          ],
        },
        sidebarContent);
    }

    const sidebarLeftHTML = generateSidebarHTML('leftSidebar', 'sidebar-left');
    const sidebarRightHTML = generateSidebarHTML('rightSidebar', 'sidebar-right');
    const collapseSidebars = slots.leftSidebarCollapse && slots.rightSidebarCollapse;

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

    const layoutHTML = [
      navHTML,
      slots.bannerPosition === 'top' && slots.banner,
      slots.secondaryNav,
      html.tag('div',
        {
          class: [
            'layout-columns',
            !collapseSidebars && 'vertical-when-thin',
            (sidebarLeftHTML || sidebarRightHTML) && 'has-one-sidebar',
            (sidebarLeftHTML && sidebarRightHTML) && 'has-two-sidebars',
            !(sidebarLeftHTML || sidebarRightHTML) && 'has-zero-sidebars',
            sidebarLeftHTML && 'has-sidebar-left',
            sidebarRightHTML && 'has-sidebar-right',
          ],
        },
        [
          sidebarLeftHTML,
          mainHTML,
          sidebarRightHTML,
        ]),
      slots.bannerPosition === 'bottom' && slots.banner,
      footerHTML,
    ].filter(Boolean).join('\n');

    return html.tags([
      `<!DOCTYPE html>`,
      html.tag('html',
        {
          lang: language.intlCode,
          'data-language-code': language.code,

          /*
          'data-url-key': 'localized.' + pagePath[0],
          ...Object.fromEntries(
            pagePath.slice(1).map((v, i) => [['data-url-value' + i], v])),
          */

          'data-rebase-localized': to('localized.root'),
          'data-rebase-shared': to('shared.root'),
          'data-rebase-media': to('media.root'),
          'data-rebase-data': to('data.root'),
        },
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

            // slots.socialEmbed,

            html.tag('link', {
              rel: 'stylesheet',
              href: to('shared.staticFile', 'site4.css', cachebust),
            }),

            html.tag('style', [
              (empty(slots.colorStyleRules)
                ? relations.defaultColorStyleRules
                : slots.colorStyleRules),
              slots.additionalStyleRules,
            ]),

            html.tag('script', {
              src: to('shared.staticFile', 'lazy-loading.js', cachebust),
            }),
          ]),

          html.tag('body',
            // {style: body.style || ''},
            [
              html.tag('div', {id: 'page-container'}, [
                // mainHTML && skippersHTML,
                layoutHTML,
              ]),

              // infoCardHTML,
              imageOverlayHTML,

              html.tag('script', {
                type: 'module',
                src: to('shared.staticFile', 'client.js', cachebust),
              }),
            ]),
        ])
    ]);
  },
};
