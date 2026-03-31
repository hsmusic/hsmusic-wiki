import {empty} from '#sugar';

export default {
  relations: (relation, entry) => ({
    artistLinks:
      (!empty(entry.headingArtists) && !entry.headingArtistText
        ? entry.headingArtists
            .map(artist => relation('linkArtist', artist))
        : null),

    artistsContent:
      (entry.headingArtistText
        ? relation('transformContent', entry.headingArtistText)
        : null),

    annotationContent:
      (entry.annotation
        ? relation('transformContent', entry.annotation)
        : null),

    bodyContent:
      relation('transformContent', entry.body),

    colorStyle:
      relation('generateColorStyleAttribute'),

    date:
      relation('generateContentEntryDate', entry),
  }),

  data: (entry) => ({
    isWikiEditorEntry:
      entry.isWikiEditorCommentary ||
      entry.isWikiEditorSource,
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

          html.tag('span', {class: 'content-entry-heading-inner-box'},
            language.encapsulate(entryCapsule, 'title', titleCapsule => [
              html.tags([
                html.tag('span', {class: 'float-spacer'},
                  {[html.onlyIfSiblings]: true}),

                relations.date,
              ]),

              html.tag('span', {class: 'content-entry-heading-text'},
                language.encapsulate(titleCapsule, workingCapsule => {
                  const workingOptions = {};

                  const artists =
                    html.tag('span', {class: 'content-entry-artists'},
                      {[html.onlyIfContent]: true},

                      (relations.artistsContent
                        ? relations.artistsContent.slot('mode', 'inline')
                     : relations.artistLinks
                        ? language.formatConjunctionList(relations.artistLinks)
                        : html.blank()));

                  if (!html.isBlank(artists)) {
                    workingCapsule += '.withArtists';
                    workingOptions.artists = artists;
                  }

                  let annotation = html.blank();
                  if (relations.annotationContent) {
                    relations.annotationContent.slots({
                      mode: 'inline',
                      absorbPunctuationFollowingExternalLinks: false,
                    });

                    annotation =
                      html.tag('span', {class: 'content-entry-annotation'},
                        html.metatag('chunkwrap', {split: ','},
                          relations.annotationContent));
                  }

                  if (!html.isBlank(annotation)) {
                    if (html.isBlank(artists)) {
                      workingCapsule += '.withAnnotation';
                      workingOptions.annotation = annotation;
                    } else {
                      workingCapsule += '.withAccent';
                      workingOptions.accent =
                        html.tag('span', {class: 'content-entry-accent'},
                          language.$(titleCapsule, 'accent.withAnnotation', {annotation}));

                      if (data.isWikiEditorEntry) {
                        workingCapsule += '.wikiEditor';
                      }
                    }
                  }

                  return language.$(workingCapsule, workingOptions);
                })),
            ]))),

        html.tag('blockquote', {class: 'content-entry-body'},
          slots.color &&
            relations.colorStyle.clone()
              .slot('color', slots.color),

          data.isWikiEditorEntry &&
            {class: 'wiki-commentary'},

          relations.bodyContent.slot('mode', 'multiline')),
      ])),
};
