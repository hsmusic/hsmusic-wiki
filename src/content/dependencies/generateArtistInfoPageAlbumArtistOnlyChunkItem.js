export default {
  relations: (relation) => ({
    template:
      relation('generateArtistInfoPageChunkItem'),
  }),

  generate: (relations, {language}) =>
    relations.template.slots({
      content:
        language.$('artistPage.creditList.entry.album.albumArtistOnly'),
    }),
};
