export default {
  contentDependencies: [
    'generatePageSidebarBox',
    'linkFlash',
    'linkFlashAct',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, act, _flash) => ({
    box:
      relation('generatePageSidebarBox'),

    actLink:
      relation('linkFlashAct', act),

    flashLinks:
      act.flashes
        .map(flash => relation('linkFlash', flash)),
  }),

  data: (act, flash) => ({
    isFlashActPage:
      !flash,

    currentFlashIndex:
      act.flashes.indexOf(flash),

    customListTerminology:
      act.listTerminology,
  }),

  generate: (data, relations, {html, language}) =>
    relations.box.slots({
      attributes: {class: 'flash-act-map-sidebar-box'},

      content: [
        html.tag('h1', relations.actLink),

        html.tag('details',
          (data.isFlashActPage
            ? {}
            : {class: 'current', open: true}),

          [
            html.tag('summary',
              html.tag('span',
                html.tag('b',
                  (data.customListTerminology
                    ? language.sanitize(data.customListTerminology)
                    : language.$('flashSidebar.flashList.entriesInThisSection'))))),

            html.tag('ul',
              relations.flashLinks
                .map((flashLink, index) =>
                  html.tag('li',
                    index === data.currentFlashIndex &&
                      {class: 'current'},

                    flashLink))),
          ]),
        ],
    }),
};
