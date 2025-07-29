import {sortChronologically} from '#sort';
import {unique} from '#sugar';

export default {
  contentDependencies: ['generateMediumRepresentationListAlbumChunk'],
  extraDependencies: ['html'],

  query: (medium) => ({
    albums:
      sortChronologically(
        unique([
          ...medium.representedByTracks.map(({track}) => track.album),
          ...medium.representedByAlbums.map(({album}) => album),
        ])),
  }),

  relations: (relation, query, medium) => ({
    albumChunks:
      query.albums
        .map(album =>
          relation('generateMediumRepresentationListAlbumChunk',
            album,
            medium)),
  }),

  generate: (relations, {html}) =>
    html.tag('dl',
      {[html.onlyIfContent]: true},

      relations.albumChunks),
};
