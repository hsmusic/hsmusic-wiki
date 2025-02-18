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

  slots: {
    title: {type: 'html', mutable: false},
    id: {type: 'string', default: 'artist-commentary'},
  },

  generate: (relations, slots, {html, language}) =>
    html.tags([
      relations.heading
        .slots({
          title:
            (html.isBlank(slots.title)
              ? language.$('misc.artistCommentary')
              : slots.title),

          attributes: {id: slots.id},
        }),

      relations.entries,
    ]),
};
