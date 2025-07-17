import {stitchArrays} from '#sugar';
import {getTotalDuration} from '#wiki-data';

export default {
  contentDependencies: ['generateCoverGrid', 'image', 'linkAlbum'],
  extraDependencies: ['language'],

  relations: (relation, albums, _group) => ({
    coverGrid:
      relation('generateCoverGrid'),

    links:
      albums.map(album =>
        relation('linkAlbum', album)),

    images:
      albums.map(album =>
        (album.hasCoverArt
          ? relation('image', album.coverArtworks[0])
          : relation('image')))
  }),

  data: (albums, group) => ({
    names:
      albums.map(album => album.name),

    styles:
      albums.map(album => album.style),

    tracks:
      albums.map(album => album.tracks.length),

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
      })),
};
