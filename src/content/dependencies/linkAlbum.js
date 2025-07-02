export default {
  contentDependencies: ['linkThing', 'linkTrack'],

  relations: (relation, album) => ({
    link:
      (album.style === 'single'
        ? relation('linkTrack', album.tracks[0])
        : relation('linkThing', 'localized.album', album)),
  }),

  generate: (relations) => relations.link,
};
