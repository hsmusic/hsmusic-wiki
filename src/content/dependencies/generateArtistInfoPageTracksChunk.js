import {stitchArrays} from '#sugar';
import {getTotalDuration} from '#wiki-data';

export default {
  contentDependencies: [
    'generateArtistInfoPageChunk',
    'generateArtistInfoPageTracksChunkItem',
    'linkAlbum',
  ],

  relations: (relation, artist, album, tracks, contribs) => ({
    template:
      relation('generateArtistInfoPageChunk'),

    albumLink:
      relation('linkAlbum', album),

    items:
      stitchArrays({
        track: tracks,
        contribs: contribs,
      }).map(({track, contribs}) =>
          relation('generateArtistInfoPageTracksChunkItem',
            artist,
            track,
            contribs)),
  }),

  data: (_artist, album, tracks, _contribs) => ({
    // STUB: This is flat-out incorrect date behavior.
    date:
      album.date,

    duration:
      getTotalDuration(tracks, {originalReleasesOnly: true}),

    durationApproximate:
      tracks
        .filter(track => track.duration && track.isOriginalRelease)
        .length > 1,
  }),

  generate: (data, relations) =>
    relations.template.slots({
      mode: 'album',
      albumLink: relations.albumLink,
      date: data.date,
      duration: data.duration,
      durationApproximate: data.durationApproximate,
      items: relations.items,
    }),
};
