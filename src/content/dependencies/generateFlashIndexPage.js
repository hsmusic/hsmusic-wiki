import {stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateColorStyleVariables',
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

    jumpLinkColorVariables:
      query.jumpActs
        .map(() => relation('generateColorStyleVariables')),

    actColorVariables:
      query.flashActs
        .map(() => relation('generateColorStyleVariables')),

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

    jumpLinkColors:
      query.jumpActs
        .map(act => act.jumpColor),

    jumpLinkLabels:
      query.jumpActs
        .map(act => act.jump),

    actAnchors:
      query.flashActs
        .map(act => act.directory),

    actColors:
      query.flashActs
        .map(act => act.color),

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
        html.tag('p',
          {class: 'quick-info'},
          language.$('misc.jumpTo')),

        html.tag('ul',
          {class: 'quick-info'},
          stitchArrays({
            colorVariables: relations.jumpLinkColorVariables,
            anchor: data.jumpLinkAnchors,
            color: data.jumpLinkColors,
            label: data.jumpLinkLabels,
          }).map(({colorVariables, anchor, color, label}) =>
              html.tag('li',
                html.tag('a', {
                  href: '#' + anchor,
                  style: colorVariables.slot('color', color).content,
                }, label)))),

        stitchArrays({
          colorVariables: relations.actColorVariables,
          actLink: relations.actLinks,
          anchor: data.actAnchors,
          color: data.actColors,

          coverGrid: relations.actCoverGrids,
          coverGridImages: relations.actCoverGridImages,
          coverGridLinks: relations.actCoverGridLinks,
          coverGridNames: data.actCoverGridNames,
          coverGridPaths: data.actCoverGridPaths,
        }).map(({
            colorVariables,
            anchor,
            color,
            actLink,

            coverGrid,
            coverGridImages,
            coverGridLinks,
            coverGridNames,
            coverGridPaths,
          }, index) => [
            html.tag('h2',
              {
                id: anchor,
                style: colorVariables.slot('color', color).content,
              },
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
