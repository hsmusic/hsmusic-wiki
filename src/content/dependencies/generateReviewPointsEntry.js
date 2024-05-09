import {empty} from '#sugar';

export default {
  contentDependencies: [
    'generateReferenceDiscussionItem',
    'linkArtist',
    'transformContent',
  ],

  extraDependencies: ['html', 'language'],

  relations(relation, point) {
    const relations = {};

    if (point.notes) {
      relations.bodyContent =
        relation('transformContent', point.notes);
    }

    if (!empty(point.referralArtists)) {
      relations.referralArtistLinks =
        point.referralArtists
          .map(artist => relation('linkArtist', artist));
    }

    if (!empty(point.referenceDiscussions)) {
      relations.referenceDiscussionItems =
        point.referenceDiscussions
          .map(discussion => relation('generateReferenceDiscussionItem', discussion));
    }

    return relations;
  },

  data: (point) => ({
    date: point.dateRecorded,
    field: point.field,
  }),

  generate(data, relations, {html, language}) {
    const prefix = 'misc.reviewPoints.entry';

    return html.tags([
      html.tag('p', {class: 'review-point-heading'},
        language.$(prefix, 'title', {
          field:
            html.tag('var', {class: 'review-point-field'},
              language.sanitize(data.field)),

          date:
            language.formatDate(data.date),
        })),

      html.tag('p', {class: 'review-point-info'},
        {[html.joinChildren]: html.tag('br')},

        [
          relations.referralArtistLinks &&
            language.$(prefix, 'referralArtists', {
              artists:
                language.formatUnitList(relations.referralArtistLinks),
            }),
        ]),

      html.tag('ul', {class: 'review-point-reference-discussions'},
        {[html.onlyIfContent]: true},
        relations.referenceDiscussionItems),

      html.tag('blockquote', {class: 'review-point-body'},
        !relations.bodyContent && {class: 'no-notes'},
        (relations.bodyContent
          ? relations.bodyContent.slot('mode', 'multiline')
          : language.$(prefix, 'noNotes'))),
    ]);
  },
};
