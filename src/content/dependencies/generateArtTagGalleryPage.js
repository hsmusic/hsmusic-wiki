import {sortAlbumsTracksChronologically} from '#sort';
import {stitchArrays} from '#sugar';

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
    const things = tag.taggedInThings.slice();

    sortAlbumsTracksChronologically(things, {
      getDate: thing => thing.coverArtDate ?? thing.date,
      latestFirst: true,
    });

    return {things};
  },

  relations(relation, query, sprawl, tag) {
    const relations = {};

    relations.layout =
      relation('generatePageLayout');

    relations.artTagMainLink =
      relation('linkArtTag', tag);

    relations.quickDescription =
      relation('generateQuickDescription', tag);

    relations.coverGrid =
      relation('generateCoverGrid');

    relations.links =
      query.things.map(thing =>
        (thing.album
          ? relation('linkTrack', thing)
          : relation('linkAlbum', thing)));

    relations.images =
      query.things.map(thing =>
        relation('image', thing.artTags));

    return relations;
  },

  data(query, sprawl, tag) {
    const data = {};

    data.enableListings = sprawl.enableListings;

    data.name = tag.name;
    data.color = tag.color;

    data.numArtworks = query.things.length;

    data.names =
      query.things.map(thing => thing.name);

    data.paths =
      query.things.map(thing =>
        (thing.album
          ? ['media.trackCover', thing.album.directory, thing.directory, thing.coverArtFileExtension]
          : ['media.albumCover', thing.directory, thing.coverArtFileExtension]));

    data.dimensions =
      query.things.map(thing => thing.coverArtDimensions);

    data.coverArtists =
      query.things.map(thing =>
        thing.coverArtistContribs
          .map(({artist}) => artist.name));

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

          relations.coverGrid
            .slots({
              links: relations.links,
              names: data.names,
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
