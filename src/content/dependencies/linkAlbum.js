export default {
  relations: (relation, album) => ({
    link:
      (album.style === 'single'
        ? relation('linkTrack', album.tracks[0])
        : relation('linkThing', 'localized.album', album)),
  }),

  data: (album) => ({
    style: album.style,
    name: album.name,
  }),

  generate: (data, relations, {language}) =>
    (data.style === 'single'
      ? relations.link.slot('content', language.sanitize(data.name))
      : relations.link),
};
