import {empty} from '../../util/sugar.js';

export default {
  extraDependencies: [
    'html',
    'language',
    'to',
  ],

  generate({
    cachebust,
    html,
    language,
    to,
  }) {
    return html.template(slot =>
      slot('title', ([...title]) =>
      slot('headingMode', ([headingMode = 'static']) => {
        let titleHTML = null;

        if (!empty(title)) {
          if (headingMode === 'sticky') {
            /*
              generateStickyHeadingContainer({
                coverSrc: cover.src,
                coverAlt: cover.alt,
                coverArtTags: cover.artTags,
                title,
              })
            */
          } else if (headingMode === 'static') {
            titleHTML = html.tag('h1', title);
          }
        }

        const mainHTML =
          html.tag('main', {
            id: 'content',
            class: slot('mainClass'),
          }, [
            titleHTML,

            slot('cover'),

            html.tag('div',
              {
                [html.onlyIfContent]: true,
                class: 'main-content-container',
              },
              slot('mainContent')),
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
          // footerHTML,
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

                // slot('socialEmbed'),

                html.tag('link', {
                  rel: 'stylesheet',
                  href: to('shared.staticFile', `site3.css?${cachebust}`),
                }),

                /*
                html.tag('style',
                  {[html.onlyIfContent]: true},
                  [
                    theme,
                    stylesheet,
                  ]),
                */

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
      })));
  },
};
