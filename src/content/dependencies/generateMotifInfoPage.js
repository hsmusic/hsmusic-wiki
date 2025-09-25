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

    hasStaff:
      motif.hasStaff,

    color:
      motif.color,
  }),

  generate: (data, relations, {html, language, to}) =>
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
          data.hasStaff &&
            html.tag('img', {class: 'motif-staff'},
              {src: to('media.motifStaff', data.directory)}),

          html.tag('p',
            {[html.onlyIfContent]: true},

            language.$('releaseInfo.derivesFromMotifs', {
              [language.onlyIfOptions]: ['motifs'],

              motifs:
                language.formatConjunctionList(relations.derivesFromMotifLinks),
            })),

          data.abcNotation &&
            html.tag('p',
              html.tag('code', {class: 'abc'},
                {[html.joinChildren]: html.tag('br')},

                data.abcNotation
                  .split('\n')
                  .map(line => language.sanitize(line)))),

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
