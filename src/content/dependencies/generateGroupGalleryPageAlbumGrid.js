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

    coverGridItems:
      stitchArrays({
        artwork: query.artworks,
        album: albums,
      }).map(({artwork, album}) =>
          relation('generateCoverGridItem', artwork ?? album)),

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
    styles:
      albums.map(album => album.style),

    allWarnings:
      query.artworks.flatMap(artwork => artwork?.contentWarnings),

    hideDuration:
      albums.map(album => album.hideDuration),

    tracks:
      albums.map(album => album.tracks.length),

    durations:
      albums.map(album =>
        (album.style === 'single'
          ? album.tracks[0]?.duration ?? null
          : getTotalDuration(album.tracks))),

    notFromThisGroup:
      albums.map(album => !album.groups.includes(group)),
  }),

  generate: (data, relations, {language}) =>
    language.encapsulate('misc.coverGrid', capsule =>
      relations.coverGrid.slots({
        allWarnings: data.allWarnings,

        items:
          stitchArrays({
            item: relations.coverGridItems,
            tab: relations.tabs,
            style: data.styles,
            tracks: data.tracks,
            duration: data.durations,
            hideDuration: data.hideDuration,
            notFromThisGroup: data.notFromThisGroup,
          }).map(({
              item,
              tab,
              style,
              tracks,
              duration,
              hideDuration,
              notFromThisGroup,
            }) =>
              item.slots({
                attributes: {'data-style': style},

                notFromThisGroup,
                tab,

                details:
                  language.encapsulate(capsule, 'details.albumLength', capsule =>
                    (hideDuration
                      ? null
                   : !duration && !tracks
                      ? null
                   : style === 'single' && tracks > 1 && duration
                      ? language.$(capsule, 'single.withMultipleTracks', {
                          time: language.formatDuration(duration),
                          tracks: language.countTracks(tracks, {unit: true}),
                        })
                   : style === 'single' && duration
                      ? language.$(capsule, 'single', {
                          time: language.formatDuration(duration),
                        })
                   : duration && tracks
                      ? language.$(capsule, {
                          time: language.formatDuration(duration),
                          tracks: language.countTracks(tracks, {unit: true}),
                        })
                      : language.$(capsule, 'tracksOnly', {
                          tracks: language.countTracks(tracks, {unit: true}),
                        }))),
              })),
      })),
};
