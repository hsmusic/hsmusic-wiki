export default {
  contentDependencies: [
    'transformContent',
    'generateCommentarySectionEntry',
    'generateContentHeading',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, entries) => ({
    heading:
      relation('generateContentHeading'),

    entries:
      entries.map(entry =>
        relation('generateCommentarySectionEntry', entry)),
  }),

  generate: (relations, {html, language}) =>
    html.tags([
      relations.heading
        .slots({
          id: 'artist-commentary',
          title: language.$('misc.artistCommentary')
        }),

      relations.entries,
    ]),
};
