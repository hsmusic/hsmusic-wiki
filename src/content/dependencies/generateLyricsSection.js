import {stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateContentHeading',
    'generateIntrapageDotSwitcher',
    'generateLyricsEntry',
    'transformContent',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, entries) => ({
    heading:
      relation('generateContentHeading'),

    switcher:
      relation('generateIntrapageDotSwitcher'),

    entries:
      entries
        .map(entry => relation('generateLyricsEntry', entry)),

    annotations:
      entries
        .map(entry => entry.annotation)
        .map(annotation => relation('transformContent', annotation)),
  }),

  data: (entries) => ({
    ids:
      Array.from(
        {length: entries.length},
        (_, index) => 'lyrics-entry-' + index),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('releaseInfo.lyrics', capsule =>
      html.tags([
        relations.heading
          .slots({
            attributes: {id: 'lyrics'},
            title: language.$(capsule),
          }),

        html.tag('p', {class: 'lyrics-switcher'},
          {[html.onlyIfContent]: true},

          language.$(capsule, 'switcher', {
            [language.onlyIfOptions]: ['entries'],

            entries:
              relations.switcher.slots({
                initialOptionIndex: 0,

                titles:
                  relations.annotations.map(annotation =>
                    annotation.slots({
                      mode: 'inline',
                      textOnly: true,
                    })),

                targetIDs:
                  data.ids,
              }),
          })),

        stitchArrays({
          entry: relations.entries,
          id: data.ids,
        }).map(({entry, id}, index) =>
            entry.slots({
              attributes: [
                {id},

                index >= 1 &&
                  {style: 'display: none'},
              ],
            })),
      ])),
};
