import {empty} from '#sugar';

export default {
  extraDependencies: ['html', 'language'],

  query: (thing) => ({
    entries:
      (thing.isTrack
        ? [...thing.commentary, ...thing.commentaryFromMainRelease]
        : thing.commentary),
  }),

  data: (query, _thing) => ({
    hasWikiEditorCommentary:
      query.entries
        .some(entry => entry.isWikiEditorCommentary),

    onlyWikiEditorCommentary:
      !empty(query.entries) &&
      query.entries
        .every(entry => entry.isWikiEditorCommentary),

    hasAnyCommentary:
      !empty(query.entries),
  }),

  generate: (data, {html, language}) =>
    language.encapsulate('releaseInfo.readCommentary', capsule =>
      language.$(capsule, {
        [language.onlyIfOptions]: ['link'],

        link:
          html.tag('a',
            {[html.onlyIfContent]: true},

            {href: '#artist-commentary'},

            language.encapsulate(capsule, 'link', capsule =>
              (data.onlyWikiEditorCommentary
                ? language.$(capsule, 'onlyWikiCommentary')
             : data.hasWikiEditorCommentary
                ? language.$(capsule, 'withWikiCommentary')
             : data.hasAnyCommentary
                ? language.$(capsule)
                : html.blank()))),
      })),
};
