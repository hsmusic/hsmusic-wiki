import {sortArtworksChronologically} from '#sort';
import {stitchArrays, unique} from '#sugar';

export default {
  sprawl: ({wikiInfo}) => ({
    enableListings:
      wikiInfo.enableListings,
  }),

  query(sprawl, artTag) {
    const directArtworks = artTag.directlyFeaturedInArtworks;
    const indirectArtworks = artTag.indirectlyFeaturedInArtworks;
    const allArtworks = unique([...directArtworks, ...indirectArtworks]);

    sortArtworksChronologically(allArtworks, {latestFirst: true});

    return {directArtworks, indirectArtworks, allArtworks};
  },

  relations: (relation, query, sprawl, artTag) => ({
    layout:
      relation('generatePageLayout'),

    navLinks:
      relation('generateArtTagNavLinks', artTag),

    additionalNamesBox:
      relation('generateAdditionalNamesBox', artTag.additionalNames),

    quickDescription:
      relation('generateQuickDescription', artTag),

    featuredLine:
      relation('generateArtTagGalleryPageFeaturedLine'),

    showingLine:
      relation('generateArtTagGalleryPageShowingLine'),

    extraReadingLinks:
      artTag.extraReadingURLs
        .map(entry => relation('linkExternal', entry)),

    ancestorLinks:
      artTag.directAncestorArtTags
        .map(artTag => relation('linkArtTagGallery', artTag)),

    descendantLinks:
      artTag.directDescendantArtTags
        .map(artTag => relation('linkArtTagGallery', artTag)),

    coverGrid:
      relation('generateCoverGrid'),

    coverGridItems:
      query.allArtworks
        .map(artwork => relation('generateCoverGridItem', artwork)),
  }),

  data: (query, sprawl, artTag) => ({
    enableListings: sprawl.enableListings,

    name: artTag.name,
    color: artTag.color,

    numArtworksIndirectly: query.indirectArtworks.length,
    numArtworksDirectly: query.directArtworks.length,
    numArtworksTotal: query.allArtworks.length,

    onlyFeaturedIndirectly:
      query.allArtworks.map(artwork => !query.directArtworks.includes(artwork)),

    hasMixedDirectIndirect:
      query.allArtworks.some(artwork => query.directArtworks.includes(artwork)) &&
      query.allArtworks.some(artwork => !query.directArtworks.includes(artwork)),

    allWarnings:
      query.allArtworks
        .flatMap(artwork => artwork?.contentWarnings),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('artTagGalleryPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
            tag: data.name,
          }),

        headingMode: 'static',
        color: data.color,

        additionalNames: relations.additionalNamesBox,

        mainClasses: ['top-index'],
        mainContent: [
          relations.quickDescription.slots({
            extraReadingLinks: relations.extraReadingLinks,
          }),

          html.tag('p', {class: 'quick-info'}, [
            data.numArtworksTotal === 0 &&
              language.encapsulate(pageCapsule, 'featuredLine.notFeatured', capsule => [
                language.$(capsule),
                html.tag('br'),
                language.$(capsule, 'callToAction'),
              ]),

            data.numArtworksTotal >= 1 &&
              relations.featuredLine.clone().slots({
                string:
                  (data.hasMixedDirectIndirect
                    ? 'altogether'
                    : 'simple'),

                filter: 'all',
                count: data.numArtworksTotal,
              }),

            data.hasMixedDirectIndirect && [
              relations.featuredLine.clone().slots({
                string: 'direct',
                filter: 'direct',
                count: data.numArtworksDirectly,
              }),

              relations.featuredLine.clone().slots({
                string: 'indirect',
                filter: 'indirect',
                count: data.numArtworksIndirectly,
              }),
            ],

            data.hasMixedDirectIndirect && [
              html.tag('br'),

              relations.showingLine.clone()
                .slot('filter', 'all'),

              relations.showingLine.clone()
                .slot('filter', 'direct'),

              relations.showingLine.clone()
                .slot('filter', 'indirect'),
            ],
          ]),

          html.tag('p', {id: 'descends-from-line'},
            {class: 'quick-info'},
            {[html.onlyIfContent]: true},

            language.$(pageCapsule, 'descendsFrom', {
              [language.onlyIfOptions]: ['tags'],
              tags: language.formatUnitList(relations.ancestorLinks),
            })),

          html.tag('p', {id: 'descendants-line'},
            {class: 'quick-info'},
            {[html.onlyIfContent]: true},

            language.$(pageCapsule, 'descendants', {
              [language.onlyIfOptions]: ['tags'],
              tags: language.formatUnitList(relations.descendantLinks),
            })),

          relations.coverGrid.slots({
            lazy: 12,
            allWarnings: data.allWarnings,

            items:
              stitchArrays({
                item: relations.coverGridItems,
                onlyFeaturedIndirectly: data.onlyFeaturedIndirectly,
              }).map(({item, onlyFeaturedIndirectly}) =>
                  item.slots({
                    attributes: [
                      onlyFeaturedIndirectly &&
                        {class: 'featured-indirectly'},
                    ],
                  })),
          }),
        ],

        navLinkStyle: 'hierarchical',
        navLinks:
          html.resolve(
            relations.navLinks
              .slot('currentExtra', 'gallery')),
      })),
};
