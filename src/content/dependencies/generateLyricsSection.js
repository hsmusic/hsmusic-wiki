export default {
  contentDependencies: [
    'generateContentHeading',
    'generateLyricsEntry',
    'generateLyricsSwitcher',
    'transformContent',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, entries) => ({
    heading:
      relation('generateContentHeading'),

    switcher:
      relation('generateLyricsSwitcher', entries),

    entries:
      entries
        .map(entry => relation('generateLyricsEntry', entry)),
  }),

  generate: (relations, {html, language}) =>
    html.tags([
      relations.heading
        .slots({
          attributes: {id: 'lyrics'},
          title: language.$('releaseInfo.lyrics'),
        }),

      relations.switcher,

      relations.entries
        .map((entry, index) =>
          entry.slots({
            attributes: [
              index >= 1 &&
                {style: 'display: none'},
            ],
          })),
    ]),
};
