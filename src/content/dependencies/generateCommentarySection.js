export default {
  contentDependencies: [
    'transformContent',
    'generateCommentaryEntry',
    'generateContentHeading',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, entries) => ({
    heading:
      relation('generateContentHeading'),

    entries:
      entries.map(entry =>
        relation('generateCommentaryEntry', entry)),
  }),

  generate: (relations, {html, language}) =>
    html.tags([
      relations.heading
        .slots({
          attributes: {id: 'artist-commentary'},
          title: language.$('misc.artistCommentary'),
        }),

      relations.entries,
    ]),
};
