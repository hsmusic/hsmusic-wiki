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

    durations:
      albums.map(album => getTotalDuration(album.tracks)),

    tracks:
      albums.map(album => album.tracks.length),

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

        info:
          stitchArrays({
            tracks: data.tracks,
            duration: data.durations,
          }).map(({tracks, duration}) =>
              language.$(capsule, 'details.albumLength', {
                tracks: language.countTracks(tracks, {unit: true}),
                time: language.formatDuration(duration),
              })),
      })),
};
