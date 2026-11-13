export default {
  relations: (relation, supertag, subtag) => ({
    coverGrid:
      relation('generateCoverGrid'),

    coverGridItems:
      subtag.directDescendantArtTags
        .map(subsubtag =>
          relation('generateArtTagGalleryPageSubtagCoverGridItem',
            supertag, subtag, subsubtag)),
  }),

  generate: (relations) =>
    relations.coverGrid.slots({
      items: relations.coverGridItems,
    }),
};
