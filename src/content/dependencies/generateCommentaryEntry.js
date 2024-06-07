import {empty} from '#sugar';

export default {
  contentDependencies: [
    'generateColorStyleAttribute',
    'linkArtist',
    'transformContent',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, entry) => ({
    artistLinks:
      (!empty(entry.artists) && !entry.artistDisplayText
        ? entry.artists
            .map(artist => relation('linkArtist', artist))
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

    colorStyle:
      relation('generateColorStyleAttribute'),
  }),

  data: (entry) => ({
    date: entry.date,
  }),

  slots: {
    color: {validate: v => v.isColor},
  },

  generate(data, relations, slots, {html, language}) {
    const artistsSpan =
      html.tag('span', {class: 'commentary-entry-artists'},
        (relations.artistsContent
          ? relations.artistsContent.slot('mode', 'inline')
       : relations.artistLinks
          ? language.formatConjunctionList(relations.artistLinks)
          : language.$('misc.artistCommentary.entry.title.noArtists')));

    const accentParts = ['misc.artistCommentary.entry.title.accent'];
    const accentOptions = {};

    if (relations.annotationContent) {
      accentParts.push('withAnnotation');
      accentOptions.annotation =
        relations.annotationContent.slot('mode', 'inline');
    }

    const accent =
      (accentParts.length > 1
        ? html.tag('span', {class: 'commentary-entry-accent'},
            language.$(...accentParts, accentOptions))
        : null);

    const titlePrefix = 'misc.artistCommentary.entry.title';
    const titleParts = [titlePrefix];
    const titleOptions = {artists: artistsSpan};

    if (accent) {
      titleParts.push('withAccent');
      titleOptions.accent = accent;
    }

    const style =
      slots.color &&
        relations.colorStyle.slot('color', slots.color);

    return html.tags([
      html.tag('p', {class: 'commentary-entry-heading'},
        style,
        [
          html.tag('time',
            {[html.onlyIfContent]: true},
            language.$(titlePrefix, 'date', {
              [language.onlyIfOptions]: ['date'],
              date: language.formatDate(data.date),
            })),

          language.$(...titleParts, titleOptions),
        ]),

      html.tag('blockquote', {class: 'commentary-entry-body'},
        style,
        relations.bodyContent.slot('mode', 'multiline')),
    ]);
  },
};
