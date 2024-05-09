export default {
  contentDependencies: ['generateReviewPointsEntry', 'generateContentHeading'],
  extraDependencies: ['html', 'language'],

  relations: (relation, entries) => ({
    heading:
      relation('generateContentHeading'),

    entries:
      entries.map(entry =>
        relation('generateReviewPointsEntry', entry)),
  }),

  generate: (relations, {html, language}) =>
    html.tags([
      relations.heading
        .slots({
          id: 'review-points',
          title: language.$('misc.reviewPoints'),
        }),

      relations.entries,
    ]),
};
