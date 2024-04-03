import {stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generatePageSidebarBox',
    'linkFlashAct',
    'linkFlashIndex',
  ],

  extraDependencies: ['getColors', 'html', 'wikiData'],

  sprawl: ({flashSideData}) => ({flashSideData}),

  relations: (relation, sprawl, _act, _flash) => ({
    box:
      relation('generatePageSidebarBox'),

    flashIndexLink:
      relation('linkFlashIndex'),

    sideActLinks:
      sprawl.flashSideData
        .map(side => side.acts
          .map(act => relation('linkFlashAct', act))),
  }),

  data: (sprawl, act, flash) => ({
    isFlashActPage:
      !flash,

    sideNames:
      sprawl.flashSideData
        .map(side => side.name),

    sideColors:
      sprawl.flashSideData
        .map(side => side.color),

    currentSideIndex:
      sprawl.flashSideData.indexOf(act.side),

    currentActIndex:
      act.side.acts.indexOf(act),
  }),

  generate: (data, relations, {getColors, html}) =>
    relations.box.slots({
      attributes: {class: 'flash-act-map-sidebar-box'},

      content: [
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
      ],
    }),
};
