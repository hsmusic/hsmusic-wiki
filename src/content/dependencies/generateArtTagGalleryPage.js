import {sortAlbumsTracksChronologically} from '#sort';
import {empty, stitchArrays, unique} from '#sugar';

export default {
  contentDependencies: [
    'generateCoverGrid',
    'generatePageLayout',
    'generateQuickDescription',
    'image',
    'linkAlbum',
    'linkArtTag',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({wikiInfo}) {
    return {
      enableListings: wikiInfo.enableListings,
    };
  },

  query(sprawl, tag) {
    const directThings = tag.directlyTaggedInThings;
    const indirectThings = tag.indirectlyTaggedInThings;
    const allThings = unique([...directThings, ...indirectThings]);

    sortAlbumsTracksChronologically(allThings, {
      getDate: thing => thing.coverArtDate ?? thing.date,
      latestFirst: true,
    });

    return {directThings, indirectThings, allThings};
  },

  relations(relation, query, sprawl, tag) {
    const relations = {};

    relations.layout =
      relation('generatePageLayout');

    relations.artTagMainLink =
      relation('linkArtTag', tag);

    relations.quickDescription =
      relation('generateQuickDescription', tag);

    if (!empty(tag.directAncestorTags)) {
      relations.ancestorLinks =
        tag.directAncestorTags.map(tag =>
          relation('linkArtTag', tag));
    }

    if (!empty(tag.directDescendantTags)) {
      relations.descendantLinks =
        tag.directDescendantTags.map(tag =>
          relation('linkArtTag', tag));
    }

    relations.coverGrid =
      relation('generateCoverGrid');

    relations.links =
      query.allThings.map(thing =>
        (thing.album
          ? relation('linkTrack', thing)
          : relation('linkAlbum', thing)));

    relations.images =
      query.allThings.map(thing =>
        relation('image', thing.artTags));

    return relations;
  },

  data(query, sprawl, tag) {
    const data = {};

    data.enableListings = sprawl.enableListings;

    data.name = tag.name;
    data.color = tag.color;
    data.hasLongerDescription = tag.descriptionShort !== tag.description;

    data.numArtworks = query.allThings.length;

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

    return data;
  },

  generate: (data, relations, {html, language}) =>
    language.encapsulate('tagPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
            tag: data.name,
          }),

        headingMode: 'static',

        color: data.color,

        mainClasses: ['top-index'],
        mainContent: [
          relations.quickDescription,

          html.tag('p', {class: 'quick-info'},
            language.$(pageCapsule, 'infoLine', {
              coverArts: language.countCoverArts(data.numArtworks, {
                unit: true,
              }),
            })),

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

          relations.coverGrid
            .slots({
              links: relations.links,
              names: data.names,

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
        navLinks: [
          {auto: 'home'},

          data.enableListings &&
            {
              path: ['localized.listingIndex'],
              title: language.$('listingIndex.title'),
            },

          {
            html:
              language.$(pageCapsule, 'nav.tag', {
                tag: relations.artTagMainLink,
              }),
          },
        ],
      })),
};
