import {sortArtworksChronologically} from '#sort';
import {empty, stitchArrays, unique} from '#sugar';

export default {
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

    data.artworkArtists =
      query.allArtworks
        .map(artwork => artwork.artistContribs
          .map(contrib => contrib.artist.name));

    data.artworkLabels =
      query.allArtworks
        .map(artwork => artwork.label)

    data.onlyFeaturedIndirectly =
      query.allArtworks.map(artwork =>
        !query.directArtworks.includes(artwork));

    data.hasMixedDirectIndirect =
      data.onlyFeaturedIndirectly.includes(true) &&
      data.onlyFeaturedIndirectly.includes(false);

    data.allWarnings =
      query.allArtworks
        .flatMap(artwork => artwork?.contentWarnings);

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
                stitchArrays({
                  artists: data.artworkArtists,
                  label: data.artworkLabels,
                }).map(({artists, label}) =>
                    language.encapsulate('misc.coverGrid.details.coverArtists', workingCapsule => {
                      const workingOptions = {};

                      workingOptions[language.onlyIfOptions] = ['artists'];
                      workingOptions.artists =
                        language.formatUnitList(artists);

                      if (label) {
                        workingCapsule += '.customLabel';
                        workingOptions.label = label;
                      }

                      return language.$(workingCapsule, workingOptions);
                    })),

              revealAllWarnings: data.allWarnings,
            }),
        ],

        navLinkStyle: 'hierarchical',
        navLinks:
          html.resolve(
            relations.navLinks
              .slot('currentExtra', 'gallery')),
      })),
};
