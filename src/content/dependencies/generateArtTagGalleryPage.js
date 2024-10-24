import {sortAlbumsTracksChronologically} from '#sort';
import {empty, stitchArrays, unique} from '#sugar';

export default {
  contentDependencies: [
    'generateArtTagGalleryPageFeaturedLine',
    'generateArtTagGalleryPageShowingLine',
    'generateArtTagNavLinks',
    'generateCoverGrid',
    'generatePageLayout',
    'generateQuickDescription',
    'image',
    'linkAlbum',
    'linkArtTagGallery',
    'linkExternal',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({wikiInfo}) {
    return {
      enableListings: wikiInfo.enableListings,
    };
  },

  query(sprawl, artTag) {
    const directThings = artTag.directlyTaggedInThings;
    const indirectThings = artTag.indirectlyTaggedInThings;
    const allThings = unique([...directThings, ...indirectThings]);

    sortAlbumsTracksChronologically(allThings, {
      getDate: thing => thing.coverArtDate ?? thing.date,
      latestFirst: true,
    });

    return {directThings, indirectThings, allThings};
  },

  relations(relation, query, sprawl, artTag) {
    const relations = {};

    relations.layout =
      relation('generatePageLayout');

    relations.navLinks =
      relation('generateArtTagNavLinks', artTag);

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
      query.allThings
        .map(thing =>
          (thing.album
            ? relation('linkTrack', thing)
            : relation('linkAlbum', thing)));

    relations.images =
      query.allThings
        .map(thing => relation('image', thing.artTags));

    return relations;
  },

  data(query, sprawl, artTag) {
    const data = {};

    data.enableListings = sprawl.enableListings;

    data.name = artTag.name;
    data.color = artTag.color;

    data.numArtworksIndirectly = query.indirectThings.length;
    data.numArtworksDirectly = query.directThings.length;
    data.numArtworksTotal = query.allThings.length;

    data.names =
      query.allThings.map(thing => thing.name);

    data.paths =
      query.allThings.map(thing =>
        (thing.album
          ? ['media.trackCover', thing.album.directory, thing.directory, thing.coverArtFileExtension]
          : ['media.albumCover', thing.directory, thing.coverArtFileExtension]));

    data.dimensions =
      query.allThings.map(thing => thing.coverArtDimensions);

    data.coverArtists =
      query.allThings.map(thing =>
        thing.coverArtistContribs
          .map(({artist}) => artist.name));

    data.onlyFeaturedIndirectly =
      query.allThings.map(thing =>
        !query.directThings.includes(thing));

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
            html.tag('p', {class: 'quick-info'},
              language.$(pageCapsule, 'descendsFrom', {
                tags: language.formatConjunctionList(relations.ancestorLinks),
              })),

          relations.descendantLinks &&
            html.tag('p', {class: 'quick-info'},
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
              names: data.names,
              lazy: 12,

              classes:
                data.onlyFeaturedIndirectly.map(onlyFeaturedIndirectly =>
                  (onlyFeaturedIndirectly ? 'featured-indirectly' : '')),

              images:
                stitchArrays({
                  image: relations.images,
                  path: data.paths,
                  dimensions: data.dimensions,
                }).map(({image, path, dimensions}) =>
                    image.slots({
                      path,
                      dimensions,
                    })),

              info:
                data.coverArtists.map(names =>
                  (names === null
                    ? null
                    : language.$('misc.albumGrid.details.coverArtists', {
                        artists: language.formatUnitList(names),
                      }))),
            }),
        ],

        navLinkStyle: 'hierarchical',
        navLinks:
          relations.navLinks
            .slot('currentExtra', 'gallery')
            .content,
      })),
};
