import {stitchArrays} from '#sugar';

export default {
  query: (things, _group) => ({
    artworks:
      things.map(thing =>
        (thing.isAlbum && thing.hasCoverArt
          ? thing.coverArtworks[0]
       : thing.isTrack && thing.hasUniqueCoverArt
          ? thing.trackArtworks[0]
       : thing.isTrack && thing.album.hasCoverArt
          ? thing.album.coverArtworks[0]
          : null)),
  }),

  relations: (relation, query, things, group) => ({
    coverGrid:
      relation('generateCoverGrid'),

    coverGridItems:
      stitchArrays({
        artwork: query.artworks,
        thing: things,
      }).map(({artwork, thing}) =>
          relation('generateCoverGridItem', artwork ?? thing, thing)),

    links:
      things
        .map(thing => relation('linkAnythingMan', thing)),

    images:
      query.artworks
        .map(artwork => relation('image', artwork)),

    tabs:
      things
        .map(thing =>
          (thing.isAlbum
            ? relation('generateGroupGalleryPageAlbumGridTab', thing, group)
         : thing.isTrack
            ? relation('generateGroupGalleryPageTrackGridTab', thing, group)
            : null)),
  }),

  data: (query, things, group) => ({
    showRevealAllArtworksControl:
      group.showRevealAllArtworksControl,

    styles:
      things.map(thing =>
        (thing.isAlbum ? thing.style :
         thing.isTrack ? 'select track' :
         null)),

    allWarnings:
      query.artworks.flatMap(artwork => artwork?.contentWarnings),

    hideDuration:
      things.map(thing =>
        (thing.isAlbum ? thing.hideDuration : false)),

    tracks:
      things.map(thing =>
        (thing.isAlbum ? thing.tracks.length : null)),

    durations:
      things.map(thing =>
        (thing.isAlbum && thing.style === 'single'
          ? thing.tracks[0]?.duration ?? null
       : thing.isAlbum
          ? thing.duration.sum
       : thing.isTrack
          ? thing.duration
          : null)),

    notFromThisGroup:
      things.map(thing =>
        !thing.groups.includes(group) &&
        !thing.ownGroups?.includes(group)),
  }),

  generate: (data, relations, {language}) =>
    language.encapsulate('misc.coverGrid', capsule =>
      relations.coverGrid.slots({
        allWarnings:
          (data.showRevealAllArtworksControl
            ? data.allWarnings
            : null),

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

                   : style === 'select track' && duration
                      ? language.$(capsule, 'selectTrack.withTime', {
                          time: language.formatDuration(duration),
                        })

                   : style === 'select track'
                      ? language.$(capsule, 'selectTrack')

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
