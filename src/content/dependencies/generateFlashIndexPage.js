import {stitchArrays} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'generateColorStyleVariables',
    'generateCoverGrid',
    'generatePageLayout',
    'image',
    'linkFlash',
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

    actFirstFlashLinks:
      query.flashActs
        .map(act => relation('linkFlash', act.flashes[0])),

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
        .map(act => act.anchor),

    jumpLinkColors:
      query.jumpActs
        .map(act => act.jumpColor),

    jumpLinkLabels:
      query.jumpActs
        .map(act => act.jump),

    actAnchors:
      query.flashActs
        .map(act => act.anchor),

    actColors:
      query.flashActs
        .map(act => act.color),

    actNames:
      query.flashActs
        .map(act => act.name),

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
          firstFlashLink: relations.actFirstFlashLinks,
          anchor: data.actAnchors,
          color: data.actColors,
          name: data.actNames,

          coverGrid: relations.actCoverGrids,
          coverGridImages: relations.actCoverGridImages,
          coverGridLinks: relations.actCoverGridLinks,
          coverGridNames: data.actCoverGridNames,
          coverGridPaths: data.actCoverGridPaths,
        }).map(({
            colorVariables,
            anchor,
            color,
            name,
            firstFlashLink,

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
              firstFlashLink.slot('content', name)),

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
