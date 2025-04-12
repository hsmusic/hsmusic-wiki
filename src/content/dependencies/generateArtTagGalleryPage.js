import {sortArtworksChronologically} from '#sort';
import {empty, unique} from '#sugar';

export default {
  contentDependencies: [
    'generateAdditionalNamesBox',
    'generateArtTagGalleryPageFeaturedLine',
    'generateArtTagGalleryPageShowingLine',
    'generateArtTagNavLinks',
    'generateCoverGrid',
    'generatePageLayout',
    'generateQuickDescription',
    'image',
    'linkAnythingMan',
    'linkArtTagGallery',
    'linkExternal',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({wikiInfo}) {
    return {
      enableListings: wikiInfo.enableListings,
    };
  },

  query(sprawl, artTag) {
    const directArtworks = artTag.directlyFeaturedInArtworks;
    const indirectArtworks = artTag.indirectlyFeaturedInArtworks;
    const allArtworks = unique([...directArtworks, ...indirectArtworks]);

    sortArtworksChronologically(allArtworks, {latestFirst: true});

    return {directArtworks, indirectArtworks, allArtworks};
  },

  relations(relation, query, sprawl, artTag) {
    const relations = {};

    relations.layout =
      relation('generatePageLayout');

    relations.navLinks =
      relation('generateArtTagNavLinks', artTag);

    relations.additionalNamesBox =
      relation('generateAdditionalNamesBox', artTag.additionalNames);

    relations.quickDescription =
      relation('generateQuickDescription', artTag);

    relations.featuredLine =
      relation('generateArtTagGalleryPageFeaturedLine');

    relations.showingLine =
      relation('generateArtTagGalleryPageShowingLine');

    if (!empty(artTag.extraReadingURLs)) {
      relations.extraReadingLinks =
        artTag.extraReadingURLs
          .map(url => relation('linkExternal', url));
    }

    if (!empty(artTag.directAncestorArtTags)) {
      relations.ancestorLinks =
        artTag.directAncestorArtTags
          .map(artTag => relation('linkArtTagGallery', artTag));
    }

    if (!empty(artTag.directDescendantArtTags)) {
      relations.descendantLinks =
        artTag.directDescendantArtTags
          .map(artTag => relation('linkArtTagGallery', artTag));
    }

    relations.coverGrid =
      relation('generateCoverGrid');

    relations.links =
      query.allArtworks
        .map(artwork => relation('linkAnythingMan', artwork.thing));

    relations.images =
      query.allArtworks
        .map(artwork => relation('image', artwork));

    return relations;
  },

  data(query, sprawl, artTag) {
    const data = {};

    data.enableListings = sprawl.enableListings;

    data.name = artTag.name;
    data.color = artTag.color;

    data.numArtworksIndirectly = query.indirectArtworks.length;
    data.numArtworksDirectly = query.directArtworks.length;
    data.numArtworksTotal = query.allArtworks.length;

    data.names =
      query.allArtworks
        .map(artwork => artwork.thing.name);

    data.coverArtists =
      query.allArtworks
        .map(artwork => artwork.artistContribs
          .map(contrib => contrib.artist.name));

    data.onlyFeaturedIndirectly =
      query.allArtworks.map(artwork =>
        !query.directArtworks.includes(artwork));

    data.hasMixedDirectIndirect =
      data.onlyFeaturedIndirectly.includes(true) &&
      data.onlyFeaturedIndirectly.includes(false);

    return data;
  },

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
            extraReadingLinks: relations.extraReadingLinks ?? null,
          }),

          data.numArtworksTotal === 0 &&
            html.tag('p', {class: 'quick-info'},
              language.encapsulate(pageCapsule, 'featuredLine.notFeatured', capsule => [
                language.$(capsule),
                html.tag('br'),
                language.$(capsule, 'callToAction'),
              ])),

          data.numArtworksTotal >= 1 &&
            relations.featuredLine.clone()
              .slots({
                showing: 'all',
                count: data.numArtworksTotal,
              }),

          data.hasMixedDirectIndirect && [
            relations.featuredLine.clone()
              .slots({
                showing: 'direct',
                count: data.numArtworksDirectly,
              }),

            relations.featuredLine.clone()
              .slots({
                showing: 'indirect',
                count: data.numArtworksIndirectly,
              }),
          ],

          relations.ancestorLinks &&
            html.tag('p', {id: 'descends-from-line'},
              {class: 'quick-info'},
              language.$(pageCapsule, 'descendsFrom', {
                tags: language.formatUnitList(relations.ancestorLinks),
              })),

          relations.descendantLinks &&
            html.tag('p', {id: 'descendants-line'},
              {class: 'quick-info'},
              language.$(pageCapsule, 'descendants', {
                tags: language.formatUnitList(relations.descendantLinks),
              })),

          data.hasMixedDirectIndirect && [
            relations.showingLine.clone()
              .slot('showing', 'all'),

            relations.showingLine.clone()
              .slot('showing', 'direct'),

            relations.showingLine.clone()
              .slot('showing', 'indirect'),
          ],

          relations.coverGrid
            .slots({
              links: relations.links,
              images: relations.images,
              names: data.names,
              lazy: 12,

              classes:
                data.onlyFeaturedIndirectly.map(onlyFeaturedIndirectly =>
                  (onlyFeaturedIndirectly ? 'featured-indirectly' : '')),

              info:
                data.coverArtists.map(names =>
                  (names === null
                    ? null
                    : language.$('misc.coverGrid.details.coverArtists', {
                        artists: language.formatUnitList(names),
                      }))),
            }),
        ],

        navLinkStyle: 'hierarchical',
        navLinks:
          html.resolve(
            relations.navLinks
              .slot('currentExtra', 'gallery')),
      })),
};
