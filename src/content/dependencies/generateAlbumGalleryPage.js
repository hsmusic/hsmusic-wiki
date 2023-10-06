import {compareArrays, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateAlbumGalleryCoverArtistsLine',
    'generateAlbumGalleryNoTrackArtworksLine',
    'generateAlbumGalleryStatsLine',
    'generateAlbumNavAccent',
    'generateAlbumStyleRules',
    'generateCoverGrid',
    'generatePageLayout',
    'image',
    'linkAlbum',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language'],

  query(album) {
    const query = {};

    const tracksWithUniqueCoverArt =
      album.tracks
        .filter(track => track.hasUniqueCoverArt);

    // Don't display "all artwork by..." for albums where there's
    // only one unique artwork in the first place.
    if (tracksWithUniqueCoverArt.length > 1) {
      const allCoverArtistArrays =
        tracksWithUniqueCoverArt
          .map(track => track.coverArtistContribs)
          .map(contribs => contribs.map(contrib => contrib.who));

      const allSameCoverArtists =
        allCoverArtistArrays
          .slice(1)
          .every(artists => compareArrays(artists, allCoverArtistArrays[0]));

      if (allSameCoverArtists) {
        query.coverArtistsForAllTracks =
          allCoverArtistArrays[0];
      }
    }

    return query;
  },

  relations(relation, query, album) {
    const relations = {};

    relations.layout =
      relation('generatePageLayout');

    relations.albumStyleRules =
      relation('generateAlbumStyleRules', album, null);

    relations.albumLink =
      relation('linkAlbum', album);

    relations.albumNavAccent =
      relation('generateAlbumNavAccent', album, null);

    relations.statsLine =
      relation('generateAlbumGalleryStatsLine', album);

    if (album.tracks.every(track => !track.hasUniqueCoverArt)) {
      relations.noTrackArtworksLine =
        relation('generateAlbumGalleryNoTrackArtworksLine');
    }

    if (query.coverArtistsForAllTracks) {
      relations.coverArtistsLine =
        relation('generateAlbumGalleryCoverArtistsLine', query.coverArtistsForAllTracks);
    }

    relations.coverGrid =
      relation('generateCoverGrid');

    relations.links =
      album.tracks.map(track =>
        relation('linkTrack', track));

    relations.images =
      album.tracks.map(track =>
        (track.hasUniqueCoverArt
          ? relation('image', track.artTags)
          : relation('image')));

    return relations;
  },

  data(query, album) {
    const data = {};

    data.name = album.name;
    data.color = album.color;

    data.names =
      album.tracks.map(track => track.name);

    data.coverArtists =
      album.tracks.map(track => {
        if (query.coverArtistsForAllTracks) {
          return null;
        }

        if (track.hasUniqueCoverArt) {
          return track.coverArtistContribs.map(({who: artist}) => artist.name);
        }

        return null;
      });

    data.paths =
      album.tracks.map(track =>
        (track.hasUniqueCoverArt
          ? ['media.trackCover', track.album.directory, track.directory, track.coverArtFileExtension]
          : null));

    return data;
  },

  generate(data, relations, {language}) {
    return relations.layout
      .slots({
        title:
          language.$('albumGalleryPage.title', {
            album: data.name,
          }),

        headingMode: 'static',

        color: data.color,
        styleRules: [relations.albumStyleRules],

        mainClasses: ['top-index'],
        mainContent: [
          relations.statsLine,
          relations.coverArtistsLine,
          relations.noTrackArtworksLine,

          relations.coverGrid
            .slots({
              links: relations.links,
              names: data.names,
              images:
                stitchArrays({
                  image: relations.images,
                  path: data.paths,
                  name: data.names,
                }).map(({image, path, name}) =>
                    image.slots({
                      path,
                      missingSourceContent:
                        language.$('misc.albumGalleryGrid.noCoverArt', {name}),
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
          {
            html:
              relations.albumLink
                .slot('attributes', {class: 'current'}),
            accent:
              relations.albumNavAccent.slots({
                showTrackNavigation: false,
                showExtraLinks: true,
                currentExtra: 'gallery',
              }),
          },
        ],
      });
  },
};
