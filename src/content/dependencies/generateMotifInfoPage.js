import {sortMotifConnectionsChronologically} from '#sort';

export default {
  sprawl: ({wikiInfo}) => ({
    enableListings:
      wikiInfo.enableListings,
  }),

  relations: (relation, _sprawl, motif) => ({
    layout:
      relation('generatePageLayout'),

    additionalNamesBox:
      relation('generateAdditionalNamesBox', motif.additionalNames),

    motifNavLink:
      relation('linkMotif', motif),

    connectionsContentHeading:
      relation('generateMotifConnectionsContentHeading', motif),

    derivesFromMotifLinks:
      motif.derivesFromMotifs
        .map(motif => relation('linkMotif', motif)),

    derivedForMotifLinks:
      motif.derivedForMotifs
        .map(motif => relation('linkMotif', motif)),

    featuringTracksList:
      relation('generateMotifConnectionList',
        sortMotifConnectionsChronologically(motif.featuredInTracks.slice()),
        motif),
  }),

  data: (sprawl, motif) => ({
    enableListings:
      sprawl.enableListings,

    name:
      motif.name,

    abcNotation:
      motif.abcNotation,

    directory:
      motif.directory,
    color:
      motif.color,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('motifInfoPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
            motif: language.sanitize(data.name),
          }),

        headingMode: 'sticky',
        color: data.color,

        additionalNames: relations.additionalNamesBox,

        mainContent: [
          html.tag('p',
            {[html.onlyIfContent]: true},

            language.$('releaseInfo.derivesFromMotifs', {
              [language.onlyIfOptions]: ['motifs'],

              motifs:
                language.formatConjunctionList(relations.derivesFromMotifLinks),
            })),

          data.abcNotation &&
            html.tag('div', {class: 'abc-full', 'data-notation': JSON.stringify(data.abcNotation)},
              [
                html.tag('div', {class: 'motif-sheet'}),
                html.tag('div', {class: 'motif-control'})
              ]
            ),

          // I tried VERY HARD to get js/client/abc-render.js to work properly...
          data.abcNotation &&
            html.tag('script', {src: "../../static-5p14/lib/abcjs/dist/abcjs-basic.js"}),
          data.abcNotation &&
            html.tag('link', {rel: "stylesheet", href: "../../static-5p14/lib/abcjs/abcjs-audio.css"}),

          html.tags([
            relations.connectionsContentHeading.clone().slots({
              attributes: {id: 'derived-for-motifs'},
              string: 'releaseInfo.motifsThatDeriveFromMotif',
            }),

            html.tag('ul',
              {[html.onlyIfContent]: true},

              relations.derivedForMotifLinks
                .map(link => html.tag('li', link))),
          ]),

          html.tags([
            relations.connectionsContentHeading.clone().slots({
              attributes: {id: 'featured-in-tracks'},
              string: 'releaseInfo.tracksThatFeatureMotif',
            }),

            relations.featuringTracksList,
          ]),
        ],

        navLinkStyle: 'hierarchical',

        navLinks: [
          {auto: 'home'},

          data.enableListings &&
            {
              path: ['localized.listingIndex'],
              title: language.$('listingIndex.title'),
            },

          {
            html:
              language.$(pageCapsule, 'nav.motif', {
                motif: relations.motifNavLink,
              }),
          },
        ],
      })),
};
