export default {
  sprawl: ({wikiInfo}) => ({
    enableListings:
      wikiInfo.enableListings,
  }),

  relations: (relation, _sprawl, motif) => ({
    layout:
      relation('generatePageLayout'),

    sidebar:
      relation('generateMotifSidebar', motif),

    navAccent:
      relation('generateMotifNavAccent', motif),

    additionalNamesBox:
      relation('generateAdditionalNamesBox', motif.additionalNames),

    motifSectionLink:
      (motif.motifSection.isDefaultMotifSection
        ? null
        : relation('linkMotifSection', motif.motifSection)),

    motifNavLink:
      relation('linkMotifWithoutTooltip', motif),

    connectionsContentHeading:
      relation('generateMotifConnectionsContentHeading', motif),

    derivesFromMotifLinks:
      motif.derivesFromMotifs
        .map(motif => relation('linkMotif', motif)),

    derivedForMotifLinks:
      motif.derivedForMotifs
        .map(motif => relation('linkMotif', motif)),

    featuringTracksList:
      relation('generateDividedMotifConnectionList',
        motif.featuredInTracks,
        motif),
  }),

  data: (sprawl, motif) => ({
    enableListings:
      sprawl.enableListings,

    name:
      motif.name,

    color:
      motif.color,

    abcNotation:
      motif.abcNotation,

    directory:
      motif.directory,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('motifInfoPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
            motif: language.sanitize(data.name),
          }),

        loadLibraries: ['abcjs'],

        headingMode: 'sticky',
        color: data.color,

        additionalNames:
          relations.additionalNamesBox.slots({
            alwaysVisible: true,
          }),

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

            relations.featuringTracksList.slots({
              headingString: 'releaseInfo.tracksThatFeatureMotif',
            }),
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

          relations.motifSectionLink &&
            {
              html:
                language.$(pageCapsule, 'nav.section', {
                  section: relations.motifSectionLink,
                }),
            },

          {
            html:
              (relations.motifSectionLink
                ? language.$(pageCapsule, 'nav.motif', {
                    motif: relations.motifNavLink,
                  })
                : language.$(pageCapsule, 'nav.motif.withoutSection', {
                    motif: relations.motifNavLink,
                  })),
          },
        ],

        navBottomRowContent: relations.navAccent,

        leftSidebar: relations.sidebar,
      })),
};
