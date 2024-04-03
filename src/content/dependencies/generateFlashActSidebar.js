import {stitchArrays} from '#sugar';

export default {
  contentDependencies: ['linkFlash', 'linkFlashAct', 'linkFlashIndex'],
  extraDependencies: ['getColors', 'html', 'language', 'wikiData'],

  // So help me Gog, the flash sidebar is heavily hard-coded.

  sprawl: ({flashActData, flashSideData}) => ({flashActData, flashSideData}),

  query(sprawl, act, flash) {
    const sideNames =
      sprawl.flashSideData
        .map(side => side.name);

    const sideColors =
      sprawl.flashSideData
        .map(side => side.color);

    const sideActs =
      sprawl.flashSideData
        .map(side => side.acts);

    const currentActFlashes =
      act.flashes;

    const currentFlashIndex =
      currentActFlashes.indexOf(flash);

    const currentSideIndex =
      sideActs.findIndex(acts => acts.includes(act));

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
