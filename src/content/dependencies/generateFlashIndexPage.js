import {stitchArrays} from '#sugar';

export default {
  sprawl: ({flashActData}) => ({flashActData}),

  query(sprawl) {
    const flashActs =
      sprawl.flashActData.slice();

    const jumpActs =
      flashActs
        .filter(act => act.side.acts.indexOf(act) === 0);

    return {flashActs, jumpActs};
  },

  relations: (relation, query) => ({
    layout:
      relation('generatePageLayout'),

    jumpLinkColorStyles:
      query.jumpActs
        .map(act => relation('generateColorStyleAttribute', act.side.color)),

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
          .map(flash => relation('image', flash.coverArtwork))),
  }),

  data: (query) => ({
    jumpLinkAnchors:
      query.jumpActs
        .map(act => act.directory),

    jumpLinkLabels:
      query.jumpActs
        .map(act => act.side.name),

    actAnchors:
      query.flashActs
        .map(act => act.directory),

    actCoverGridNames:
      query.flashActs
        .map(act => act.flashes
          .map(flash => flash.name)),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('flashIndex', pageCapsule =>
      relations.layout.slots({
        title: language.$(pageCapsule, 'title'),
        headingMode: 'static',

        mainClasses: ['flash-index'],
        mainContent: [
          html.tags([
            html.tag('p', {class: 'quick-info'},
              {[html.onlyIfSiblings]: true},
              language.$('misc.jumpTo')),

            html.tag('ul', {class: 'quick-info'},
              {[html.onlyIfContent]: true},
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
          ]),

          stitchArrays({
            colorStyle: relations.actColorStyles,
            actLink: relations.actLinks,
            anchor: data.actAnchors,

            coverGrid: relations.actCoverGrids,
            coverGridImages: relations.actCoverGridImages,
            coverGridLinks: relations.actCoverGridLinks,
            coverGridNames: data.actCoverGridNames,
          }).map(({
              colorStyle,
              actLink,
              anchor,

              coverGrid,
              coverGridImages,
              coverGridLinks,
              coverGridNames,
            }, index) => [
              html.tag('h2',
                {id: anchor},
                colorStyle,
                actLink),

              coverGrid.slots({
                links: coverGridLinks,
                images: coverGridImages,
                names: coverGridNames,
                lazy: index === 0 ? 4 : true,
              }),
            ]),
        ],

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},
          {auto: 'current'},
        ],
      })),
};
