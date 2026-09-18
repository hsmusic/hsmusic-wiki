export default {
  relations: (relation, detail) => ({
    row:
      (detail.kind === 'soundfont'
        ? relation('generateSoundfontSoundDetailRow', detail)
        : null),
  }),

  generate: (relations) =>
    relations.row,
};
