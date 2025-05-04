import {sortChronologically} from '#sort';
import {stitchArrays} from '#sugar';
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

  query(_sprawl, group) {
    const query = {};

    query.allAlbums =
      sortChronologically(group.albums.slice(), {latestFirst: true});

    query.allTracks =
      query.allAlbums.flatMap((album) => album.tracks);

    query.carouselAlbums =
      filterItemsForCarousel(group.featuredAlbums);

    return query;
  },

  relations: (relation, query, sprawl, group) => ({
    layout:
      relation('generatePageLayout'),

    navLinks:
      relation('generateGroupNavLinks', group),

    secondaryNav:
      (sprawl.enableGroupUI
        ? relation('generateGroupSecondaryNav', group)
        : null),

    sidebar:
      (sprawl.enableGroupUI
        ? relation('generateGroupSidebar', group)
        : null),

    coverCarousel:
      relation('generateCoverCarousel'),

    carouselLinks:
      query.carouselAlbums
        .map(album => relation('linkAlbum', album)),

    carouselImages:
      query.carouselAlbums
        .map(album => relation('image', album.coverArtworks[0])),

    quickDescription:
      relation('generateQuickDescription', group),

    coverGrid:
      relation('generateCoverGrid'),

    gridLinks:
      query.allAlbums
        .map(album => relation('linkAlbum', album)),

    gridImages:
      query.allAlbums.map(album =>
        (album.hasCoverArt
          ? relation('image', album.coverArtworks[0])
          : relation('image'))),
  }),

  data: (query, _sprawl, group) => ({
    name:
      group.name,

    color:
      group.color,

    numAlbums:
      query.allAlbums.length,

    numTracks:
      query.allTracks.length,

    totalDuration:
      getTotalDuration(query.allTracks, {mainReleasesOnly: true}),

    gridNames:
      query.allAlbums.map(album => album.name),

    gridDurations:
      query.allAlbums.map(album => getTotalDuration(album.tracks)),

    gridNumTracks:
      query.allAlbums.map(album => album.tracks.length),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('groupGalleryPage', pageCapsule =>
      relations.layout.slots({
        title: language.$(pageCapsule, 'title', {group: data.name}),
        headingMode: 'static',

        color: data.color,

        mainClasses: ['top-index'],
        mainContent: [
          relations.coverCarousel.slots({
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
