export default {
  contentDependencies: [
    'generateFooterLocalizationLinks',
  ],

  extraDependencies: [
    'cachebust',
    'html',
    'language',
    'to',
    'transformMultiline',
    'wikiInfo',
  ],

  relations(relation) {
    const relations = {};

    relations.footerLocalizationLinks =
      relation('generateFooterLocalizationLinks');

    return relations;
  },

  generate(relations, {
    cachebust,
    html,
    language,
    to,
    transformMultiline,
    wikiInfo,
  }) {
    return html.template({
      annotation: 'generatePageLayout',

      slots: {
        title: {type: 'html'},
        cover: {type: 'html'},

        mainContent: {type: 'html'},
        footerContent: {type: 'html'},
        socialEmbed: {type: 'html'},

        headingMode: {
          validate: v => v.is('sticky', 'static'),
          default: 'static',
        },

        styleRules: {
          validate: v => v.arrayOf(v.isString),
          default: [],
        },

        mainClasses: {
          validate: v => v.arrayOf(v.isString),
          default: [],
        },
      },

      content(slots) {
        let titleHTML = null;

        if (!html.isBlank(slots.title)) {
          switch (slots.headingMode) {
            case 'sticky':
              /*
                generateStickyHeadingContainer({
                  coverSrc: cover.src,
                  coverAlt: cover.alt,
                  coverArtTags: cover.artTags,
                  title,
                })
              */
              break;
            case 'static':
              titleHTML = html.tag('h1', slots.title);
              break;
          }
        }

        let footerContent = slots.footerContent;

        if (html.isBlank(footerContent) && wikiInfo.footerContent) {
          footerContent = transformMultiline(wikiInfo.footerContent);
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

        const layoutHTML = [
          // navHTML,
          // banner.position === 'top' && bannerHTML,
          // secondaryNavHTML,
          html.tag('div',
            {
              class: [
                'layout-columns',
                // !collapseSidebars && 'vertical-when-thin',
                // (sidebarLeftHTML || sidebarRightHTML) && 'has-one-sidebar',
                // (sidebarLeftHTML && sidebarRightHTML) && 'has-two-sidebars',
                // !(sidebarLeftHTML || sidebarRightHTML) && 'has-zero-sidebars',
                // sidebarLeftHTML && 'has-sidebar-left',
                // sidebarRightHTML && 'has-sidebar-right',
              ],
            },
            [
              // sidebarLeftHTML,
              mainHTML,
              // sidebarRightHTML,
            ]),
          // banner.position === 'bottom' && bannerHTML,
          footerHTML,
        ].filter(Boolean).join('\n');

        const documentHTML = html.tags([
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
                /*
                html.tag('title',
                  showWikiNameInTitle
                    ? language.formatString('misc.pageTitle.withWikiName', {
                        title,
                        wikiName: wikiInfo.nameShort,
                      })
                    : language.formatString('misc.pageTitle', {title})),
                */

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
                  href: to('shared.staticFile', `site3.css?${cachebust}`),
                }),

                html.tag('style',
                  {[html.onlyIfContent]: true},
                  slots.styleRules),

                html.tag('script', {
                  src: to('shared.staticFile', `lazy-loading.js?${cachebust}`),
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
                  // imageOverlayHTML,

                  html.tag('script', {
                    type: 'module',
                    src: to('shared.staticFile', `client.js?${cachebust}`),
                  }),
                ]),
            ])
        ]);

        return documentHTML;
      },
    });
  },
};
