import {stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateColorStyleAttribute',
    'generatePageSidebarBox',
    'linkFlashAct',
    'linkFlashIndex',
  ],

  extraDependencies: ['html', 'wikiData'],

  sprawl: ({flashSideData}) => ({flashSideData}),

  relations: (relation, sprawl, _act, _flash) => ({
    box:
      relation('generatePageSidebarBox'),

    flashIndexLink:
      relation('linkFlashIndex'),

    sideColorStyles:
      sprawl.flashSideData
        .map(side => relation('generateColorStyleAttribute', side.color)),

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

    currentSideIndex:
      sprawl.flashSideData.indexOf(act.side),

    currentActIndex:
      act.side.acts.indexOf(act),
  }),

  generate: (data, relations, {html}) =>
    relations.box.slots({
      attributes: {class: 'flash-act-map-sidebar-box'},

      content: [
        html.tag('h1', relations.flashIndexLink),

        stitchArrays({
          sideName: data.sideNames,
          sideColorStyle: relations.sideColorStyles,
          actLinks: relations.sideActLinks,
        }).map(({sideName, sideColorStyle, actLinks}, sideIndex) =>
            html.tag('details',
              sideIndex === data.currentSideIndex &&
                {class: 'current'},

              data.isFlashActPage &&
              sideIndex === data.currentSideIndex &&
                {open: true},

              sideColorStyle.slot('context', 'primary-only'),

              [
                html.tag('summary',
                  html.tag('span',
                    html.tag('b', sideName))),

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
