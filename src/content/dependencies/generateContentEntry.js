import {empty} from '#sugar';

export default {
  relations: (relation, entry) => ({
    artistLinks:
      (!empty(entry.artists) && !entry.artistText
        ? entry.artists
            .map(artist => relation('linkArtist', artist))
        : null),

    artistsContent:
      (entry.artistText
        ? relation('transformContent', entry.artistText)
        : null),

    annotationContent:
      (entry.annotation
        ? relation('transformContent', entry.annotation)
        : null),

    bodyContent:
      (entry.body
        ? relation('transformContent', entry.body)
        : null),

    colorStyle:
      relation('generateColorStyleAttribute'),

    date:
      relation('generateContentEntryDate', entry),
  }),

  data: (entry) => ({
    isWikiEditorCommentary:
      entry.isWikiEditorCommentary,
  }),

  slots: {
    color: {validate: v => v.isColor},
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('misc.artistCommentary.entry', entryCapsule =>
      html.tags([
        html.tag('p', {class: 'content-entry-heading'},
          slots.color &&
            relations.colorStyle.clone()
              .slot('color', slots.color),

          !html.isBlank(relations.date) &&
            {class: 'dated'},

          language.encapsulate(entryCapsule, 'title', titleCapsule => [
            html.tag('span', {class: 'content-entry-heading-text'},
              language.encapsulate(titleCapsule, workingCapsule => {
                const workingOptions = {};

                workingOptions.artists =
                  html.tag('span', {class: 'content-entry-artists'},
                    (relations.artistsContent
                      ? relations.artistsContent.slot('mode', 'inline')
                   : relations.artistLinks
                      ? language.formatConjunctionList(relations.artistLinks)
                      : language.$(titleCapsule, 'noArtists')));

                const accent =
                  html.tag('span', {class: 'content-entry-accent'},
                    {[html.onlyIfContent]: true},

                    language.encapsulate(titleCapsule, 'accent', accentCapsule =>
                      language.encapsulate(accentCapsule, workingCapsule => {
                        const workingOptions = {};

                        if (relations.annotationContent) {
                          workingCapsule += '.withAnnotation';
                          workingOptions.annotation =
                            relations.annotationContent.slots({
                              mode: 'inline',
                              absorbPunctuationFollowingExternalLinks: false,
                            });
                        }

                        if (workingCapsule === accentCapsule) {
                          return html.blank();
                        } else {
                          return language.$(workingCapsule, workingOptions);
                        }
                      })));

                if (!html.isBlank(accent)) {
                  workingCapsule += '.withAccent';
                  workingOptions.accent = accent;
                }

                return language.$(workingCapsule, workingOptions);
              })),

            relations.date,
          ])),

        html.tag('blockquote', {class: 'content-entry-body'},
          slots.color &&
            relations.colorStyle.clone()
              .slot('color', slots.color),

          data.isWikiEditorCommentary &&
            {class: 'wiki-commentary'},

          relations.bodyContent.slot('mode', 'multiline')),
      ])),
};
