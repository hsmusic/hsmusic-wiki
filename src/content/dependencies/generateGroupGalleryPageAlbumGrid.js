import {stitchArrays} from '#sugar';
import {getTotalDuration} from '#wiki-data';

export default {
  query: (albums, _group) => ({
    artworks:
      albums.map(album =>
        (album.hasCoverArt
          ? album.coverArtworks[0]
          : null)),
  }),

  relations: (relation, query, albums, group) => ({
    coverGrid:
      relation('generateCoverGrid'),

    links:
      albums
        .map(album => relation('linkAlbum', album)),

    images:
      query.artworks
        .map(artwork => relation('image', artwork)),

    tabs:
      albums
        .map(album =>
          relation('generateGroupGalleryPageAlbumGridTab', album, group)),
  }),

  data: (query, albums, group) => ({
    names:
      albums.map(album => album.name),

    styles:
      albums.map(album => album.style),

    tracks:
      albums.map(album => album.tracks.length),

    allWarnings:
      query.artworks.flatMap(artwork => artwork?.contentWarnings),

    durations:
      albums.map(album =>
        (album.hideDuration
          ? null
          : getTotalDuration(album.tracks))),

    notFromThisGroup:
      albums.map(album => !album.groups.includes(group)),
  }),

  generate: (data, relations, {language}) =>
    language.encapsulate('misc.coverGrid', capsule =>
      relations.coverGrid.slots({
        links: relations.links,
        names: data.names,
        notFromThisGroup: data.notFromThisGroup,

        images:
          stitchArrays({
            image: relations.images,
            name: data.names,
          }).map(({image, name}) =>
              image.slots({
                missingSourceContent:
                  language.$(capsule, 'noCoverArt', {
                    album: name,
                  }),
              })),

        itemAttributes:
          data.styles.map(style => ({'data-style': style})),

        tab: relations.tabs,

        info:
          stitchArrays({
            style: data.styles,
            tracks: data.tracks,
            duration: data.durations,
          }).map(({style, tracks, duration}) =>
              (style === 'single' && duration
                ? language.$(capsule, 'details.albumLength.single', {
                    time: language.formatDuration(duration),
                  })
             : duration
                ? language.$(capsule, 'details.albumLength', {
                    tracks: language.countTracks(tracks, {unit: true}),
                    time: language.formatDuration(duration),
                  })
                : null)),

        revealAllWarnings: data.allWarnings,
      })),
};
