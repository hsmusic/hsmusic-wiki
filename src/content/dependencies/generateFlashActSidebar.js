import find from '#find';
import {stitchArrays} from '#sugar';

export default {
  contentDependencies: ['linkFlash', 'linkFlashAct', 'linkFlashIndex'],
  extraDependencies: ['getColors', 'html', 'language', 'wikiData'],

  // So help me Gog, the flash sidebar is heavily hard-coded.

  sprawl: ({flashActData}) => ({flashActData}),

  query(sprawl, act, flash) {
    const findFlashAct = directory =>
      find.flashAct(directory, sprawl.flashActData, {mode: 'error'});

    const sideFirstActs = [
      findFlashAct('flash-act:a1'),
      findFlashAct('flash-act:a6a1'),
      findFlashAct('flash-act:hiveswap'),
      findFlashAct('flash-act:cool-and-new-web-comic'),
      findFlashAct('flash-act:psycholonials'),
    ];

    const sideNames = [
      `Side 1 (Acts 1-5)`,
      `Side 2 (Acts 6-7)`,
      `Additional Canon`,
      `Fan Adventures`,
      `More Flashes & Games`,
    ];

    const sideColors = [
      '#4ac925',
      '#3796c6',
      '#f2a400',
      '#c466ff',
      '#32c7fe',
    ];

    const sideFirstActIndexes =
      sideFirstActs
        .map(act => sprawl.flashActData.indexOf(act));

    const actSideIndexes =
      sprawl.flashActData
        .map((act, actIndex) => actIndex)
        .map(actIndex =>
          sideFirstActIndexes
            .findIndex((firstActIndex, i) =>
              i === sideFirstActs.length - 1 ||
                firstActIndex <= actIndex &&
                sideFirstActIndexes[i + 1] > actIndex));

    const sideActs =
      sideNames
        .map((name, sideIndex) =>
          stitchArrays({
            act: sprawl.flashActData,
            actSideIndex: actSideIndexes,
          }).filter(({actSideIndex}) => actSideIndex === sideIndex)
            .map(({act}) => act));

    const currentActFlashes =
      act.flashes;

    const currentFlashIndex =
      currentActFlashes.indexOf(flash);

    const currentSideIndex =
      actSideIndexes[sprawl.flashActData.indexOf(act)];

    const currentSideActs =
      sideActs[currentSideIndex];

    const currentActIndex =
      currentSideActs.indexOf(act);

    const visualNovelActs = [
      findFlashAct('flash-act:friendsim'),
      findFlashAct('flash-act:pesterquest'),
      findFlashAct('flash-act:psycholonials'),
    ];

    const gameSeriesActs = [
      findFlashAct('flash-act:hiveswap'),
    ];

    const listTerminology =
      (visualNovelActs.includes(act)
        ? 'volumesInThisGame'
     : gameSeriesActs.includes(act)
        ? 'gamesInThisSeries'
     : act === findFlashAct('flash-act:other-fan-adventures')
        ? 'flashesInThisSection'
     : currentSideIndex <= 1
        ? 'flashesInThisAct'
     : currentSideIndex === 3
        ? 'flashesInThisStory'
        : 'entriesInThisSection');

    return {
      sideNames,
      sideColors,
      sideActs,

      currentSideIndex,
      currentSideActs,
      currentActIndex,
      currentActFlashes,
      currentFlashIndex,

      listTerminology,
    };
  },

  relations: (relation, query, sprawl, act, _flash) => ({
    currentActLink:
      relation('linkFlashAct', act),

    flashIndexLink:
      relation('linkFlashIndex'),

    sideActLinks:
      query.sideActs
        .map(acts => acts
          .map(act => relation('linkFlashAct', act))),

    currentActFlashLinks:
      act.flashes
        .map(flash => relation('linkFlash', flash)),
  }),

  data: (query, sprawl, act, flash) => ({
    isFlashActPage: !flash,

    sideColors: query.sideColors,
    sideNames: query.sideNames,

    currentSideIndex: query.currentSideIndex,
    currentActIndex: query.currentActIndex,
    currentFlashIndex: query.currentFlashIndex,

    listTerminology: query.listTerminology,
  }),

  generate(data, relations, {getColors, html, language}) {
    const currentActBox = html.tags([
      html.tag('h1', relations.currentActLink),

      html.tag('details',
        (data.isFlashActPage
          ? {}
          : {class: 'current', open: true}),
        [
          html.tag('summary',
            html.tag('span', {class: 'group-name'},
              language.$('flashSidebar.flashList', data.listTerminology))),

          html.tag('ul',
            relations.currentActFlashLinks
              .map((flashLink, index) =>
                html.tag('li',
                  {class: index === data.currentFlashIndex && 'current'},
                  flashLink))),
        ]),
    ]);

    const sideMapBox = html.tags([
      html.tag('h1', relations.flashIndexLink),

      stitchArrays({
        sideName: data.sideNames,
        sideColor: data.sideColors,
        actLinks: relations.sideActLinks,
      }).map(({sideName, sideColor, actLinks}, sideIndex) =>
          html.tag('details', {
            class: sideIndex === data.currentSideIndex && 'current',
            open: data.isFlashActPage && sideIndex === data.currentSideIndex,
            style: sideColor && `--primary-color: ${getColors(sideColor).primary}`
          }, [
            html.tag('summary',
              html.tag('span', {class: 'group-name'},
                sideName)),

            html.tag('ul',
              actLinks.map((actLink, actIndex) =>
                html.tag('li',
                  {class:
                    sideIndex === data.currentSideIndex &&
                    actIndex === data.currentActIndex &&
                      'current'},
                  actLink))),
          ])),
    ]);

    return {
      leftSidebarMultiple:
        (data.isFlashActPage
          ? [
              {content: sideMapBox},
              {content: currentActBox},
            ]
          : [
              {content: currentActBox},
              {content: sideMapBox},
            ]),
    };
  },
};
