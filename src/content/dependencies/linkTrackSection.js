export default {
  relations: (relation, section) => ({
    link:
      relation('linkAlbum', section.album),
  }),

  data: (section) => ({
    name: section.name,

    multipleRegularTrackSections:
      section.album.trackSections
        .filter(section => section.stem === null)
        .length >= 2,

    firstDirectoryInRun:
      section.sectionsAcrossRun[0].directoryWithinAlbum,

    albumIsSingle:
      section.album.style === 'single',
  }),

  generate: (data, relations, {language}) =>
    relations.link.slots({
      content: language.sanitize(data.name),

      hash:
        (data.albumIsSingle || !data.multipleRegularTrackSections
          ? null
          : 'sec-' + data.firstDirectoryInRun),
    }),
};
