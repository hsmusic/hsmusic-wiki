import {empty} from '#sugar';

export default {
  relations: (relation, track) => ({
    infoLink: relation('linkTrack', track),
  }),

  data: (track) => ({
    trackDirectory:
      track.directory,

    albumDirectory:
      track.album.directory,

    trackHasCommentary:
      !empty(track.commentary),
  }),

  generate(data, relations, {pagePath}) {
    if (
      pagePath[0].match(/albumCommentary$/i) &&
      pagePath[1] === data.albumDirectory &&
      data.trackHasCommentary
    ) {
      relations.infoLink.setSlots({
        anchor: true,
        hash: data.trackDirectory,
      });
    }

    return relations.infoLink;
  },
};
