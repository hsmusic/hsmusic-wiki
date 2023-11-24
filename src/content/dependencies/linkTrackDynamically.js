export default {
  contentDependencies: ['linkTrack'],
  extraDependencies: ['pagePath'],

  relations: (relation, track) => ({
    infoLink: relation('linkTrack', track),
  }),

  data: (track) => ({
    trackDirectory:
      track.directory,

    albumDirectory:
      track.album.directory,

    trackHasCommentary:
      !!track.commentary,
  }),

  generate(data, relations, {pagePath}) {
    if (
      pagePath[0] === 'albumCommentary' &&
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
