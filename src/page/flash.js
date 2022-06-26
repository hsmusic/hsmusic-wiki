/** @format */

// Flash page and index specifications.

// Imports

import fixWS from 'fix-whitespace';

import * as html from '../util/html.js';

import {getFlashLink} from '../util/wiki-data.js';

// Page exports

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
      generatePreviousNextLinks,
      getArtistString,
      getFlashCover,
      getThemeString,
      link,
      language,
    }) => ({
      title: language.$('flashPage.title', {flash: flash.name}),
      theme: getThemeString(flash.color, [
        `--flash-directory: ${flash.directory}`,
      ]),

      main: {
        content: fixWS`
                    <h1>${language.$('flashPage.title', {
                      flash: flash.name,
                    })}</h1>
                    ${generateCoverLink({
                      src: getFlashCover(flash),
                      alt: language.$('misc.alt.flashArt'),
                    })}
                    <p>${language.$('releaseInfo.released', {
                      date: language.formatDate(flash.date),
                    })}</p>
                    ${
                      (flash.page || flash.urls?.length) &&
                      `<p>${language.$('releaseInfo.playOn', {
                        links: language.formatDisjunctionList(
                          [
                            flash.page && getFlashLink(flash),
                            ...(flash.urls ?? []),
                          ].map((url) => fancifyFlashURL(url, flash))
                        ),
                      })}</p>`
                    }
                    ${
                      flash.featuredTracks &&
                      fixWS`
                        <p>Tracks featured in <i>${flash.name.replace(
                          /\.$/,
                          ''
                        )}</i>:</p>
                        <ul>
                            ${flash.featuredTracks
                              .map((track) =>
                                language.$('trackList.item.withArtists', {
                                  track: link.track(track),
                                  by: `<span class="by">${language.$(
                                    'trackList.item.withArtists.by',
                                    {
                                      artists: getArtistString(
                                        track.artistContribs
                                      ),
                                    }
                                  )}</span>`,
                                })
                              )
                              .map((row) => `<li>${row}</li>`)
                              .join('\n')}
                        </ul>
                    `
                    }
                    ${
                      flash.contributorContribs.length &&
                      fixWS`
                        <p>${language.$('releaseInfo.contributors')}</p>
                        <ul>
                            ${flash.contributorContribs
                              .map(
                                (contrib) =>
                                  `<li>${getArtistString([contrib], {
                                    showContrib: true,
                                    showIcons: true,
                                  })}</li>`
                              )
                              .join('\n')}
                        </ul>
                    `
                    }
                `,
      },

      sidebarLeft: generateSidebarForFlash(flash, {link, language, wikiData}),
      nav: generateNavForFlash(flash, {
        generateChronologyLinks,
        generatePreviousNextLinks,
        link,
        language,
        wikiData,
      }),
    }),
  };

  return [page];
}

export function writeTargetless({wikiData}) {
  const {flashActData} = wikiData;

  const page = {
    type: 'page',
    path: ['flashIndex'],
    page: ({getFlashGridHTML, getLinkThemeString, link, language}) => ({
      title: language.$('flashIndex.title'),

      main: {
        classes: ['flash-index'],
        content: fixWS`
                    <h1>${language.$('flashIndex.title')}</h1>
                    <div class="long-content">
                        <p class="quick-info">${language.$('misc.jumpTo')}</p>
                        <ul class="quick-info">
                            ${flashActData
                              .filter((act) => act.jump)
                              .map(
                                ({anchor, jump, jumpColor}) => fixWS`
                                <li><a href="#${anchor}" style="${getLinkThemeString(
                                  jumpColor
                                )}">${jump}</a></li>
                            `
                              )
                              .join('\n')}
                        </ul>
                    </div>
                    ${flashActData
                      .map(
                        (act, i) => fixWS`
                        <h2 id="${act.anchor}" style="${getLinkThemeString(
                          act.color
                        )}">${link.flash(act.flashes[0], {
                          text: act.name,
                        })}</h2>
                        <div class="grid-listing">
                            ${getFlashGridHTML({
                              entries: act.flashes.map((flash) => ({
                                item: flash,
                              })),
                              lazy: i === 0 ? 4 : true,
                            })}
                        </div>
                    `
                      )
                      .join('\n')}
                `,
      },

      nav: {simple: true},
    }),
  };

  return [page];
}

// Utility functions

function generateNavForFlash(
  flash,
  {generateChronologyLinks, generatePreviousNextLinks, link, language, wikiData}
) {
  const {flashData} = wikiData;

  const previousNextLinks = generatePreviousNextLinks(flash, {
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

    content: fixWS`
            <div>
                ${generateChronologyLinks(flash, {
                  headingString: 'misc.chronology.heading.flash',
                  contribKey: 'contributorContribs',
                  getThings: (artist) => artist.flashesAsContributor,
                })}
            </div>
        `,
  };
}

function generateSidebarForFlash(flash, {link, language, wikiData}) {
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
    content: fixWS`
            <h1>${link.flashIndex('', {
              text: language.$('flashIndex.title'),
            })}</h1>
            <dl>
                ${flashActData
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
                          : true)()
                  )
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
                      fixWS`
                        <dd><ul>
                            ${act.flashes
                              .map((f) =>
                                html.tag(
                                  'li',
                                  {class: f === flash && 'current'},
                                  link.flash(f)
                                )
                              )
                              .join('\n')}
                        </ul></dd>
                    `,
                  ])
                  .filter(Boolean)
                  .join('\n')}
            </dl>
        `,
  };
}
