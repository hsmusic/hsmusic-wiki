export default {
  contentDependencies: ['linkArtist', 'transformContent'],
  extraDependencies: ['html', 'language'],

  relations: (relation, entry) => ({
    artistLink:
      (entry.artist && !entry.artistDisplayText
        ? relation('linkArtist', entry.artist)
        : null),

    artistsContent:
      (entry.artistDisplayText
        ? relation('transformContent', entry.artistDisplayText)
        : null),

    annotationContent:
      (entry.annotation
        ? relation('transformContent', entry.annotation)
        : null),

    bodyContent:
      (entry.body
        ? relation('transformContent', entry.body)
        : null),
  }),

  data: (entry) => ({
    date: entry.date,
  }),

  generate(data, relations, {html, language}) {
    const artistsSpan =
      html.tag('span', {class: 'commentary-entry-artists'},
        (relations.artistsContent
          ? relations.artistsContent.slot('mode', 'inline')
       : relations.artistLink
          ? relations.artistLink
          : language.$('misc.artistCommentary.noArtist')));

    const accentParts = ['misc.artistCommentary.entry.title.accent'];
    const accentOptions = {};

    if (relations.annotationContent) {
      accentParts.push('withAnnotation');
      accentOptions.annotation =
        relations.annotationContent.slot('mode', 'inline');
    }

    if (data.date) {
      accentParts.push('withDate');
      accentOptions.date =
        language.formatDate(data.date);
    }

    const accent =
      (accentParts.length > 1
        ? html.tag('span', {class: 'commentary-entry-accent'},
            language.$(...accentParts, accentOptions))
        : null);

    const titleParts = ['misc.artistCommentary.entry.title'];
    const titleOptions = {artists: artistsSpan};

    if (accent) {
      titleParts.push('withAccent');
      titleOptions.accent = accent;
    }

    return html.tags([
      html.tag('p', {class: 'commentary-entry-heading'},
        language.$(...titleParts, titleOptions)),

      html.tag('blockquote', {class: 'commentary-entry-body'},
        relations.bodyContent.slot('mode', 'multiline')),
    ]);
  },
};
