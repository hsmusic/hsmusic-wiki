// Flash page and index specifications.

import {empty} from '../util/sugar.js';
import {getFlashLink} from '../util/wiki-data.js';

export function condition({wikiData}) {
  return wikiData.wikiInfo.enableFlashesAndGames;
}

export function targets({wikiData}) {
  return wikiData.flashData;
}

export function write(flash, {wikiData}) {
  const page = {
    type: 'page',
    path: ['flash', flash.directory],
    page: ({
      fancifyFlashURL,
      generateChronologyLinks,
      generateCoverLink,
      generateNavigationLinks,
      getArtistString,
      getFlashCover,
      getThemeString,
      html,
      link,
      language,
    }) => ({
      title: language.$('flashPage.title', {flash: flash.name}),
      theme: getThemeString(flash.color, [
        `--flash-directory: ${flash.directory}`,
      ]),

      main: {
        content: [
          html.tag('h1',
            language.$('flashPage.title', {
              flash: flash.name,
            })),

          generateCoverLink({
            src: getFlashCover(flash),
            alt: language.$('misc.alt.flashArt'),
          }),

          html.tag('p',
            language.$('releaseInfo.released', {
              date: language.formatDate(flash.date),
            })),

          (flash.page || !empty(flash.urls)) &&
            html.tag('p',
              language.$('releaseInfo.playOn', {
                links: language.formatDisjunctionList(
                  [
                    flash.page && getFlashLink(flash),
                    ...(flash.urls ?? []),
                  ].map((url) => fancifyFlashURL(url, flash))
                ),
              })),

          ...html.fragment(
            !empty(flash.featuredTracks) && [
              html.tag('p',
                `Tracks featured in <i>${
                  flash.name.replace(/\.$/, '')
                }</i>:`),

              html.tag('ul',
                flash.featuredTracks.map(track =>
                  html.tag('li',
                    language.$('trackList.item.withArtists', {
                      track: link.track(track),
                      by: html.tag('span', {class: 'by'},
                        language.$('trackList.item.withArtists.by', {
                          artists: getArtistString(track.artistContribs),
                        })),
                    })))),
            ]),

          ...html.fragment(
            !empty(flash.contributorContribs) && [
              html.tag('p',
                language.$('releaseInfo.contributors')),

              html.tag('ul',
                flash.contributorContribs.map(contrib =>
                  html.tag('li',
                    getArtistString([contrib], {
                      showContrib: true,
                      showIcons: true,
                    })))),
            ]),
        ],
      },

      sidebarLeft: generateSidebarForFlash(flash, {
        html,
        language,
        link,
        wikiData,
      }),

      nav: generateNavForFlash(flash, {
        generateChronologyLinks,
        generateNavigationLinks,
        html,
        link,
        language,
        wikiData,
      }),
    }),
  };

  return [page];
}

export function writeTargetless({
  wikiData,
}) {
  const {flashActData} = wikiData;

  const page = {
    type: 'page',
    path: ['flashIndex'],
    page: ({
      getFlashGridHTML,
      getLinkThemeString,
      html,
      language,
      link,
    }) => ({
      title: language.$('flashIndex.title'),

      main: {
        classes: ['flash-index'],
        content: [
          html.tag('h1',
            language.$('flashIndex.title')),

          html.tag('div',
            {class: 'long-content'},
            [
              html.tag('p',
                {class: 'quick-info'},
                language.$('misc.jumpTo')),

              html.tag('ul',
                {class: 'quick-info'},
                flashActData
                  .filter(act => act.jump)
                  .map(({anchor, jump, jumpColor}) =>
                    html.tag('li',
                      html.tag('a',
                        {
                          href: '#' + anchor,
                          style: getLinkThemeString(jumpColor),
                        },
                        jump)))),
            ]),

          ...flashActData.flatMap((act, i) => [
            html.tag('h2',
              {
                id: '#' + act.anchor,
                style: getLinkThemeString(act.color),
              },
              link.flash(act.flashes[0], {
                text: act.name,
              })),

            html.tag('div',
              {class: 'grid-listing'},
              getFlashGridHTML({
                entries: act.flashes.map((flash) => ({
                  item: flash,
                })),
                lazy: i === 0 ? 4 : true,
              })),
          ]),
        ],
      },

      nav: {simple: true},
    }),
  };

  return [page];
}

// Utility functions

function generateNavForFlash(flash, {
  generateChronologyLinks,
  generateNavigationLinks,
  html,
  language,
  link,
  wikiData
}) {
  const {flashData} = wikiData;

  const previousNextLinks = generateNavigationLinks(flash, {
    data: flashData,
    linkKey: 'flash',
  });

  return {
    linkContainerClasses: ['nav-links-hierarchy'],
    links: [
      {toHome: true},
      {
        path: ['localized.flashIndex'],
        title: language.$('flashIndex.title'),
      },
      {
        html: language.$('flashPage.nav.flash', {
          flash: link.flash(flash, {class: 'current'}),
        }),
      },
    ],

    bottomRowContent: previousNextLinks && `(${previousNextLinks})`,

    content: html.tag('div',
      generateChronologyLinks(flash, {
        headingString: 'misc.chronology.heading.flash',
        contribKey: 'contributorContribs',
        getThings: (artist) => artist.flashesAsContributor,
      })),
  };
}

function generateSidebarForFlash(flash, {
  html,
  language,
  link,
  wikiData,
}) {
  // all hard-coded, sorry :(
  // this doesnt have a super portable implementation/design...yet!!

  const {flashActData} = wikiData;

  const act6 = flashActData.findIndex((act) => act.name.startsWith('Act 6'));
  const postCanon = flashActData.findIndex((act) =>
    act.name.includes('Post Canon')
  );
  const outsideCanon =
    postCanon +
    flashActData
      .slice(postCanon)
      .findIndex((act) => !act.name.includes('Post Canon'));
  const actIndex = flashActData.indexOf(flash.act);
  const side =
    actIndex < 0 ? 0 : actIndex < act6 ? 1 : actIndex <= outsideCanon ? 2 : 3;
  const currentAct = flash && flash.act;

  return {
    content: [
      html.tag('h1',
        link.flashIndex('', {
          text: language.$('flashIndex.title'),
        })),

      html.tag('dl',
        flashActData
          .filter(
            (act) =>
              act.name.startsWith('Act 1') ||
              act.name.startsWith('Act 6 Act 1') ||
              act.name.startsWith('Hiveswap') ||
              // Sorry not sorry -Yiffy
              (({index = flashActData.indexOf(act)} = {}) =>
                index < act6
                  ? side === 1
                  : index < outsideCanon
                  ? side === 2
                  : true)())
          .flatMap((act) => [
            (act.name.startsWith('Act 1') &&
              html.tag(
                'dt',
                {class: ['side', side === 1 && 'current']},
                link.flash(act.flashes[0], {
                  color: '#4ac925',
                  text: `Side 1 (Acts 1-5)`,
                })
              )) ||
              (act.name.startsWith('Act 6 Act 1') &&
                html.tag(
                  'dt',
                  {class: ['side', side === 2 && 'current']},
                  link.flash(act.flashes[0], {
                    color: '#1076a2',
                    text: `Side 2 (Acts 6-7)`,
                  })
                )) ||
              (act.name.startsWith('Hiveswap Act 1') &&
                html.tag(
                  'dt',
                  {class: ['side', side === 3 && 'current']},
                  link.flash(act.flashes[0], {
                    color: '#008282',
                    text: `Outside Canon (Misc. Games)`,
                  })
                )),
            (({index = flashActData.indexOf(act)} = {}) =>
              index < act6
                ? side === 1
                : index < outsideCanon
                ? side === 2
                : true)() &&
              html.tag(
                'dt',
                {class: act === currentAct && 'current'},
                link.flash(act.flashes[0], {text: act.name})
              ),
            act === currentAct &&
              html.tag('dd',
                html.tag('ul',
                  act.flashes
                    .map(f =>
                      html.tag('li',
                        {class: f === flash && 'current'},
                        link.flash(f))))),
          ])),
    ],
  };
}
