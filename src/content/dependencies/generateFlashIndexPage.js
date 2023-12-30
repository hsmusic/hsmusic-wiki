import {empty, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateColorStyleAttribute',
    'generateCoverGrid',
    'generatePageLayout',
    'image',
    'linkFlash',
    'linkFlashAct',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({flashActData}) => ({flashActData}),

  query(sprawl) {
    const flashActs =
      sprawl.flashActData.slice();

    const jumpActs =
      flashActs
        .filter(act => act.jump);

    return {flashActs, jumpActs};
  },

  relations: (relation, query) => ({
    layout:
      relation('generatePageLayout'),

    jumpLinkColorStyles:
      query.jumpActs
        .map(act => relation('generateColorStyleAttribute', act.jumpColor)),

    actColorStyles:
      query.flashActs
        .map(act => relation('generateColorStyleAttribute', act.color)),

    actLinks:
      query.flashActs
        .map(act => relation('linkFlashAct', act)),

    actCoverGrids:
      query.flashActs
        .map(() => relation('generateCoverGrid')),

    actCoverGridLinks:
      query.flashActs
        .map(act => act.flashes
          .map(flash => relation('linkFlash', flash))),

    actCoverGridImages:
      query.flashActs
        .map(act => act.flashes
          .map(() => relation('image'))),
  }),

  data: (query) => ({
    jumpLinkAnchors:
      query.jumpActs
        .map(act => act.directory),

    jumpLinkLabels:
      query.jumpActs
        .map(act => act.jump),

    actAnchors:
      query.flashActs
        .map(act => act.directory),

    actCoverGridNames:
      query.flashActs
        .map(act => act.flashes
          .map(flash => flash.name)),

    actCoverGridPaths:
      query.flashActs
        .map(act => act.flashes
          .map(flash => ['media.flashArt', flash.directory, flash.coverArtFileExtension])),
  }),

  generate: (data, relations, {html, language}) =>
    relations.layout.slots({
      title: language.$('flashIndex.title'),
      headingMode: 'static',

      mainClasses: ['flash-index'],
      mainContent: [
        !empty(data.jumpLinkLabels) && [
          html.tag('p', {class: 'quick-info'},
            language.$('misc.jumpTo')),

          html.tag('ul', {class: 'quick-info'},
            stitchArrays({
              colorStyle: relations.jumpLinkColorStyles,
              anchor: data.jumpLinkAnchors,
              label: data.jumpLinkLabels,
            }).map(({colorStyle, anchor, label}) =>
                html.tag('li',
                  html.tag('a',
                    {href: '#' + anchor},
                    colorStyle,
                    label)))),
        ],

        stitchArrays({
          colorStyle: relations.actColorStyles,
          actLink: relations.actLinks,
          anchor: data.actAnchors,

          coverGrid: relations.actCoverGrids,
          coverGridImages: relations.actCoverGridImages,
          coverGridLinks: relations.actCoverGridLinks,
          coverGridNames: data.actCoverGridNames,
          coverGridPaths: data.actCoverGridPaths,
        }).map(({
            colorStyle,
            actLink,
            anchor,

            coverGrid,
            coverGridImages,
            coverGridLinks,
            coverGridNames,
            coverGridPaths,
          }, index) => [
            html.tag('h2',
              {id: anchor},
              colorStyle,
              actLink),

            coverGrid.slots({
              links: coverGridLinks,
              names: coverGridNames,
              lazy: index === 0 ? 4 : true,

              images:
                stitchArrays({
                  image: coverGridImages,
                  path: coverGridPaths,
                }).map(({image, path}) =>
                    image.slot('path', path)),
            }),
          ]),
      ],

      navLinkStyle: 'hierarchical',
      navLinks: [
        {auto: 'home'},
        {auto: 'current'},
      ],
    }),
};
