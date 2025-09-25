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

    contentHeading:
      relation('generateContentHeading'),

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
          html.tags([
            language.encapsulate('releaseInfo.tracksThatFeatureMotif', capsule =>
              relations.contentHeading.clone()
                .slots({
                  attributes: {id: 'featured-in-tracks'},

                  title:
                    language.$(capsule, {
                      motif: data.name,
                    }),

                  stickyTitle:
                    language.$(capsule, 'sticky'),
                })),

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
