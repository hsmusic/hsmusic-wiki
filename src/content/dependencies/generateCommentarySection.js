import {empty} from '#sugar';

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
      (entries
        ? entries.map(entry =>
            relation('generateCommentaryEntry', entry))
        : []),
  }),

  data: (entries) => ({
    firstEntryIsDated:
      (empty(entries)
        ? null
        : !!entries[0].date),
  }),

  slots: {
    title: {type: 'html', mutable: false},
  },

  generate: (data, relations, slots, {html, language}) =>
    html.tags([
      relations.heading
        .slots({
          title:
            (html.isBlank(slots.title)
              ? language.$('misc.artistCommentary')
              : slots.title),

          attributes: [
            {id: 'artist-commentary'},
            data.firstEntryIsDated &&
              {class: 'first-entry-is-dated'},
          ],
        }),

      relations.entries,
    ]),
};
