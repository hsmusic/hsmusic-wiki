import find from '#find';
import {filterMultipleArrays, stitchArrays} from '#sugar';

export default {
  contentDependencies: ['linkFlash', 'linkFlashAct', 'linkFlashIndex'],
  extraDependencies: ['getColors', 'html', 'language', 'wikiData'],

  // So help me Gog, the flash sidebar is heavily hard-coded.

  sprawl: ({flashActData}) => ({flashActData}),

  query(sprawl, act, flash) {
    const findFlashAct = directory =>
      find.flashAct(directory, sprawl.flashActData, {mode: 'quiet'});

    const homestuckSide1 = findFlashAct('flash-act:a1');

    const sideFirstActs = [
      sprawl.flashActData[0],
      findFlashAct('flash-act:a6a1'),
      findFlashAct('flash-act:hiveswap'),
      findFlashAct('flash-act:cool-and-new-web-comic'),
      findFlashAct('flash-act:sunday-night-strifin'),
    ];

    const sideNames = [
      (homestuckSide1
        ? `Side 1 (Acts 1-5)`
        : `All flashes & games`),
      `Side 2 (Acts 6-7)`,
      `Additional Canon`,
      `Fan Adventures`,
      `Fan Games & More`,
    ];

    const sideColors = [
      (homestuckSide1
        ? '#4ac925'
        : null),
      '#3796c6',
      '#f2a400',
      '#c466ff',
      '#32c7fe',
    ];

    filterMultipleArrays(sideFirstActs, sideNames, sideColors,
      firstAct => firstAct);

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

    const fallbackListTerminology =
      (currentSideIndex <= 1
        ? 'flashesInThisAct'
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

      fallbackListTerminology,
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

    customListTerminology: act.listTerminology,
    fallbackListTerminology: query.fallbackListTerminology,
  }),

  generate(data, relations, {getColors, html, language}) {
    const currentActBoxContent = html.tags([
      html.tag('h1', relations.currentActLink),

      html.tag('details',
        (data.isFlashActPage
          ? {}
          : {class: 'current', open: true}),
        [
          html.tag('summary',
            html.tag('span', {class: 'group-name'},
              (data.customListTerminology
                ? language.sanitize(data.customListTerminology)
                : language.$('flashSidebar.flashList', data.fallbackListTerminology)))),

          html.tag('ul',
            relations.currentActFlashLinks
              .map((flashLink, index) =>
                html.tag('li',
                  index === data.currentFlashIndex &&
                    {class: 'current'},

                  flashLink))),
        ]),
    ]);

    const sideMapBoxContent = html.tags([
      html.tag('h1', relations.flashIndexLink),

      stitchArrays({
        sideName: data.sideNames,
        sideColor: data.sideColors,
        actLinks: relations.sideActLinks,
      }).map(({sideName, sideColor, actLinks}, sideIndex) =>
          html.tag('details',
            sideIndex === data.currentSideIndex &&
              {class: 'current'},

            data.isFlashActPage &&
            sideIndex === data.currentSideIndex &&
              {open: true},

            sideColor &&
              {style: `--primary-color: ${getColors(sideColor).primary}`},

            [
              html.tag('summary',
                html.tag('span', {class: 'group-name'},
                  sideName)),

              html.tag('ul',
                actLinks.map((actLink, actIndex) =>
                  html.tag('li',
                    sideIndex === data.currentSideIndex &&
                    actIndex === data.currentActIndex &&
                      {class: 'current'},

                    actLink))),
            ])),
    ]);

    const sideMapBox = {
      class: 'flash-act-map-sidebar-box',
      content: sideMapBoxContent,
    };

    const currentActBox = {
      class: 'flash-current-act-sidebar-box',
      content: currentActBoxContent,
    };

    return {
      leftSidebarMultiple:
        (data.isFlashActPage
          ? [sideMapBox, currentActBox]
          : [currentActBox, sideMapBox]),
    };
  },
};
