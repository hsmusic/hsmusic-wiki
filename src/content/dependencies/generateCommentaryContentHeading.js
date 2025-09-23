import {empty} from '#sugar';

export default {
  contentDependencies: ['generateContentContentHeading'],
  extraDependencies: ['language'],

  query: (thing) => ({
    entries:
      (thing.isTrack
        ? [...thing.commentary, ...thing.commentaryFromMainRelease]
        : thing.commentary),
  }),

  relations: (relation, _query, thing) => ({
    contentContentHeading:
      relation('generateContentContentHeading', thing),
  }),

  data: (query, _thing) => ({
    hasWikiEditorCommentary:
      query.entries.some(entry => entry.isWikiEditorCommentary),

    onlyWikiEditorCommentary:
      !empty(query.entries) &&
      query.entries.every(entry => entry.isWikiEditorCommentary),

    hasAnyCommentary:
      !empty(query.entries),
  }),

  generate: (data, relations, {language}) =>
    relations.contentContentHeading.slots({
      // It's #artist-commentary for legacy reasons... Sorry...
      attributes: {id: 'artist-commentary'},

      string:
        language.encapsulate('misc.artistCommentary', capsule =>
          (data.onlyWikiEditorCommentary
            ? language.encapsulate(capsule, 'onlyWikiCommentary')
         : data.hasWikiEditorCommentary
            ? language.encapsulate(capsule, 'withWikiCommentary')
         : data.hasAnyCommentary
            ? capsule
            : null)),
    }),
};
