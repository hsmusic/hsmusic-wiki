export default {
  relations: (relation, section) => ({
    link:
      relation('linkAlbum', section.album),
  }),

  data: (section) => ({
    name: section.name,
    directory: section.directoryWithinAlbum,

    albumIsSingle:
      section.album.style === 'single',
  }),

  generate: (data, relations, {language}) =>
    relations.link.slots({
      content: language.sanitize(data.name),

      hash:
        (data.albumIsSingle
          ? null
          : 'sec-' + data.directory),
    }),
};
