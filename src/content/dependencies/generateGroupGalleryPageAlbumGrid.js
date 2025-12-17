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
       : album.style === 'single'
          ? album.tracks[0]?.duration ?? null
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
              (!duration
                ? null
             : style === 'single' && tracks > 1
               ? language.$(capsule, 'details.albumLength.single.withMultipleTracks', {
                   time: language.formatDuration(duration),
                   tracks: language.countTracks(tracks, {unit: true}),
                 })
             : style === 'single'
                ? language.$(capsule, 'details.albumLength.single', {
                    time: language.formatDuration(duration),
                  })
                : language.$(capsule, 'details.albumLength', {
                    tracks: language.countTracks(tracks, {unit: true}),
                    time: language.formatDuration(duration),
                  }))),

        revealAllWarnings: data.allWarnings,
      })),
};
