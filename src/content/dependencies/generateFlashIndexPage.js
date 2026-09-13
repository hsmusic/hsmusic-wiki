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
        .map(act => relation('linkFlashActWithTitle', act)),

    actCoverGrids:
      query.flashActs
        .map(act =>
          relation('generateCoverGrid',
            act.flashes.map(flash => flash.coverArtwork))),
  }),

  data: (query) => ({
    jumpLinkAnchors:
      query.jumpActs
        .map(act => act.directory),

    jumpLinkLabels:
      query.jumpActs
        .map(act => act.side.name),

    jumpLinksSplitAbove:
      query.jumpActs
        .map(act => act.side.splitAbove),

    actAnchors:
      query.flashActs
        .map(act => act.directory),
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
                splitAbove: data.jumpLinksSplitAbove,
                anchor: data.jumpLinkAnchors,
                label: data.jumpLinkLabels,
              }).map(({colorStyle, splitAbove, anchor, label}) => [
                  splitAbove &&
                    html.tag('br'),

                  html.tag('li',
                    html.tag('a',
                      {href: '#' + anchor},
                      colorStyle,
                      label)),
                ])),
          ]),

          stitchArrays({
            colorStyle: relations.actColorStyles,
            actLink: relations.actLinks,
            anchor: data.actAnchors,
            coverGrid: relations.actCoverGrids,
          }).map(({
              colorStyle,
              actLink,
              anchor,
              coverGrid,
            }, index) => [
              html.tag('h2',
                {id: anchor},
                colorStyle,
                actLink),

              coverGrid.slots({
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
