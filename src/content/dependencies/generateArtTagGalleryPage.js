import {empty, stitchArrays, unique} from '#sugar';
import {sortAlbumsTracksChronologically} from '#wiki-data';

export default {
  contentDependencies: [
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

    data.numArtworks = query.allThings.length;

    data.names =
      query.allThings.map(thing => thing.name);

    data.paths =
      query.allThings.map(thing =>
        (thing.album
          ? ['media.trackCover', thing.album.directory, thing.directory, thing.coverArtFileExtension]
          : ['media.albumCover', thing.directory, thing.coverArtFileExtension]));

    data.coverArtists =
      query.allThings.map(thing =>
        thing.coverArtistContribs
          .map(({who: artist}) => artist.name));

    data.onlyFeaturedIndirectly =
      query.allThings.map(thing =>
        !query.directThings.includes(thing));

    return data;
  },

  generate(data, relations, {html, language}) {
    return relations.layout
      .slots({
        title:
          language.$('artTagGalleryPage.title', {
            tag: data.name,
          }),

        headingMode: 'static',

        color: data.color,

        mainClasses: ['top-index'],
        mainContent: [
          relations.quickDescription.slots({
            extraReadingLinks: relations.extraReadingLinks ?? null,
          }),

          html.tag('p', {class: 'quick-info'},
            (data.numArtworks === 0
              ? [
                  language.$('artTagGalleryPage.infoLine.notFeatured'),
                  html.tag('br'),
                  language.$('artTagGalleryPage.infoLine.notFeatured.callToAction'),
                ]
              : language.$('artTagGalleryPage.infoLine', {
                  coverArts: language.countArtworks(data.numArtworks, {
                    unit: true,
                  }),
                }))),

          relations.ancestorLinks &&
            html.tag('p', {class: 'quick-info'},
              language.$('artTagGalleryPage.descendsFrom', {
                tags: language.formatConjunctionList(relations.ancestorLinks),
              })),

          relations.descendantLinks &&
            html.tag('p', {clasS: 'quick-info'},
              language.$('artTagGalleryPage.descendants', {
                tags: language.formatUnitList(relations.descendantLinks),
              })),

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
                }).map(({image, path}) =>
                    image.slot('path', path)),

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
      });
  },
};
