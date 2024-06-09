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

  data: (entries) => ({
    firstEntryIsDated:
      (entries[0]
        ? !!entries[0].date
        : null),
  }),

  generate: (data, relations, {html, language}) =>
    html.tags([
      relations.heading
        .slots({
          title: language.$('misc.artistCommentary'),
          attributes: [
            {id: 'artist-commentary'},
            data.firstEntryIsDated &&
              {class: 'first-entry-is-dated'},
          ],
        }),

      relations.entries,
    ]),
};
