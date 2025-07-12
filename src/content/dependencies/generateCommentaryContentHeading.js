export default {
  contentDependencies: ['generateContentContentHeading'],
  extraDependencies: ['language'],

  relations: (relation, thing) => ({
    contentContentHeading:
      relation('generateContentContentHeading', thing),
  }),

  data: (thing) => ({
    hasWikiEditorCommentary:
      thing.commentary
        .some(entry => entry.isWikiEditorCommentary),

    onlyWikiEditorCommentary:
      thing.commentary
        .every(entry => entry.isWikiEditorCommentary),
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
            : capsule)),
    }),
};
