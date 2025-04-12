import {sortChronologically} from '#sort';
import {empty, stitchArrays} from '#sugar';
import {filterItemsForCarousel, getTotalDuration} from '#wiki-data';

export default {
  contentDependencies: [
    'generateCoverCarousel',
    'generateCoverGrid',
    'generateGroupNavLinks',
    'generateGroupSecondaryNav',
    'generateGroupSidebar',
    'generatePageLayout',
    'generateQuickDescription',
    'image',
    'linkAlbum',
    'linkListing',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({wikiInfo}) =>
    ({enableGroupUI: wikiInfo.enableGroupUI}),

  relations(relation, sprawl, group) {
    const relations = {};

    const albums =
      sortChronologically(group.albums.slice(), {latestFirst: true});

    relations.layout =
      relation('generatePageLayout');

    relations.navLinks =
      relation('generateGroupNavLinks', group);

    if (sprawl.enableGroupUI) {
      relations.secondaryNav =
        relation('generateGroupSecondaryNav', group);

      relations.sidebar =
        relation('generateGroupSidebar', group);
    }

    const carouselAlbums = filterItemsForCarousel(group.featuredAlbums);

    if (!empty(carouselAlbums)) {
      relations.coverCarousel =
        relation('generateCoverCarousel');

      relations.carouselLinks =
        carouselAlbums
          .map(album => relation('linkAlbum', album));

      relations.carouselImages =
        carouselAlbums
          .map(album => relation('image', album.coverArtworks[0]));
    }

    relations.quickDescription =
      relation('generateQuickDescription', group);

    relations.coverGrid =
      relation('generateCoverGrid');

    relations.gridLinks =
      albums
        .map(album => relation('linkAlbum', album));

    relations.gridImages =
      albums.map(album =>
        (album.hasCoverArt
          ? relation('image', album.coverArtworks[0])
          : relation('image')));

    return relations;
  },

  data(sprawl, group) {
    const data = {};

    data.name = group.name;
    data.color = group.color;

    const albums = sortChronologically(group.albums.slice(), {latestFirst: true});
    const tracks = albums.flatMap((album) => album.tracks);

    data.numAlbums = albums.length;
    data.numTracks = tracks.length;
    data.totalDuration = getTotalDuration(tracks, {mainReleasesOnly: true});

    data.gridNames = albums.map(album => album.name);
    data.gridDurations = albums.map(album => getTotalDuration(album.tracks));
    data.gridNumTracks = albums.map(album => album.tracks.length);

    return data;
  },

  generate: (data, relations, {html, language}) =>
    language.encapsulate('groupGalleryPage', pageCapsule =>
      relations.layout.slots({
        title: language.$(pageCapsule, 'title', {group: data.name}),
        headingMode: 'static',

        color: data.color,

        mainClasses: ['top-index'],
        mainContent: [
          relations.coverCarousel
            ?.slots({
              links: relations.carouselLinks,
              images: relations.carouselImages,
            }),

          relations.quickDescription,

          html.tag('p', {class: 'quick-info'},
            language.$(pageCapsule, 'infoLine', {
              tracks:
                html.tag('b',
                  language.countTracks(data.numTracks, {
                    unit: true,
                  })),

              albums:
                html.tag('b',
                  language.countAlbums(data.numAlbums, {
                    unit: true,
                  })),

              time:
                html.tag('b',
                  language.formatDuration(data.totalDuration, {
                    unit: true,
                  })),
            })),

          relations.coverGrid
            .slots({
              links: relations.gridLinks,
              names: data.gridNames,

              images:
                stitchArrays({
                  image: relations.gridImages,
                  name: data.gridNames,
                }).map(({image, name}) =>
                    image.slots({
                      missingSourceContent:
                        language.$('misc.coverGrid.noCoverArt', {
                          album: name,
                        }),
                    })),

              info:
                stitchArrays({
                  numTracks: data.gridNumTracks,
                  duration: data.gridDurations,
                }).map(({numTracks, duration}) =>
                    language.$('misc.coverGrid.details.albumLength', {
                      tracks: language.countTracks(numTracks, {unit: true}),
                      time: language.formatDuration(duration),
                    })),
            }),
        ],

        leftSidebar:
          (relations.sidebar
            ? relations.sidebar
                .slot('currentExtra', 'gallery')
                .content /* TODO: Kludge. */
            : null),

        navLinkStyle: 'hierarchical',
        navLinks:
          relations.navLinks
            .slot('currentExtra', 'gallery')
            .content,

        secondaryNav:
          relations.secondaryNav ?? null,
      })),
};
