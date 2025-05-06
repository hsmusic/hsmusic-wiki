export default {
  contentDependencies: ['linkArtist', 'linkExternal', 'transformContent'],
  extraDependencies: ['html', 'language'],

  relations: (relation, entry) => ({
    content:
      relation('transformContent', entry.body),

    artistText:
      relation('transformContent', entry.artistText),

    artistLinks:
      entry.artists
        .filter(artist => artist.name !== 'HSMusic Wiki') // smh
        .map(artist => relation('linkArtist', artist)),

    sourceLinks:
      entry.sourceURLs
        .map(url => relation('linkExternal', url)),
  }),

  data: (entry) => ({
    isWikiLyrics:
      entry.isWikiLyrics,

    hasSquareBracketAnnotations:
      entry.hasSquareBracketAnnotations,
  }),

  slots: {
    attributes: {
      type: 'attributes',
      mutable: false,
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('misc.lyrics', capsule =>
      html.tag('div', {class: 'lyrics-entry'},
        slots.attributes,

        [
          html.tag('p', {class: 'lyrics-details'},
            {[html.onlyIfContent]: true},
            {[html.joinChildren]: html.tag('br')},

            [
              language.$(capsule, 'source', {
                [language.onlyIfOptions]: ['source'],

                source:
                  language.formatUnitList(
                    relations.sourceLinks.map(link =>
                      link.slots({
                        indicateExternal: true,
                        tab: 'separate',
                      }))),
              }),

              data.isWikiLyrics &&
                language.$(capsule, 'contributors', {
                  [language.onlyIfOptions]: ['contributors'],

                  contributors:
                    (html.isBlank(relations.artistText)
                      ? language.formatUnitList(relations.artistLinks)
                      : relations.artistText.slot('mode', 'inline')),
                }),

              // This check is doubled up only for clarity: entries are coded
              // in data so that `hasSquareBracketAnnotations` is only true
              // if `isWikiLyrics` is also true.
              data.isWikiLyrics &&
              data.hasSquareBracketAnnotations &&
                language.$(capsule, 'squareBracketAnnotations'),
            ]),

          relations.content.slot('mode', 'lyrics'),
        ])),
};
