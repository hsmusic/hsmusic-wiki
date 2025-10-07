import {sortAlbumsTracksChronologically, sortContributionsChronologically}
  from '#sort';
import {chunkArtistTrackContributions} from '#wiki-data';

export default {
  query(track, artist) {
    const relevantInfoPageChunkingContributions =
      track.allReleases
        .flatMap(release => [
          ...release.artistContribs,
          ...release.contributorContribs,
        ])
        .filter(c => c.artist === artist);

    sortContributionsChronologically(
      relevantInfoPageChunkingContributions,
      sortAlbumsTracksChronologically);

    const contributionChunks =
      chunkArtistTrackContributions(relevantInfoPageChunkingContributions);

    const trackChunks =
      contributionChunks
        .map(chunksInAlbum => chunksInAlbum
          .map(chunksInTrack => chunksInTrack[0].thing));

    const trackChunksForThisAlbum =
      trackChunks
        .filter(tracks => tracks[0].album === track.album);

    const containingChunkIndex =
      trackChunksForThisAlbum
        .findIndex(tracks => tracks.includes(track));

    return {containingChunkIndex};
  },

  relations: (relation, _query, track, _artist) => ({
    colorStyle:
      relation('generateColorStyleAttribute', track.album.color),
  }),

  data: (query, track, _artist) => ({
    albumName:
      track.album.name,

    albumDirectory:
      track.album.directory,

    containingChunkIndex:
      query.containingChunkIndex,
  }),

  generate: (data, relations, {html, language}) =>
    html.tag('a',
      {href: `#tracks-${data.albumDirectory}-${data.containingChunkIndex}`},
      relations.colorStyle.slot('context', 'primary-only'),
      language.sanitize(data.albumName)),
};
