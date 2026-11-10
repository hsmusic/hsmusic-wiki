export default {
  relations: (relation, section) => ({
    link:
      relation('linkAlbum', section.album),
  }),

  data: (section) => ({
    name: section.name,
    directory: section.directoryWithinAlbum,
  }),

  generate: (data, relations, {language}) =>
    relations.link.slots({
      content: language.sanitize(data.name),
      hash: 'sec-' + data.directory,
    }),
};
