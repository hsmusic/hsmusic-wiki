export default {
  contentDependencies: ['linkAnythingMan'],
  extraDependencies: ['html', 'language'],

  query(contribution) {
    let previous = contribution;
    while (previous && previous.thing === contribution.thing) {
      previous = previous.previousBySameArtist;
    }

    let next = contribution;
    while (next && next.thing === contribution.thing) {
      next = next.nextBySameArtist;
    }

    return {previous, next};
  },

  relations: (relation, query, _contribution) => ({
    previousLink:
      (query.previous
        ? relation('linkAnythingMan', query.previous.thing)
        : null),

    nextLink:
      (query.next
        ? relation('linkAnythingMan', query.next.thing)
        : null),
  }),

  data: (query, _contribution) => ({
    previousName:
      (query.previous
        ? query.previous.thing.name
        : null),

    nextName:
      (query.next
        ? query.next.thing.name
        : null),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('misc.artistLink', capsule =>
      html.tags([
        relations.previousLink?.slots({
          attributes: {class: 'chronology-link'},
          content: [
            html.tag('span', {class: 'chronology-symbol'},
              language.$(capsule, 'previousSymbol')),

            html.tag('span', {class: 'chronology-text'},
              language.sanitize(data.previousName)),
          ],
        }),

        relations.nextLink?.slots({
          attributes: {class: 'chronology-link'},
          content: [
            html.tag('span', {class: 'chronology-symbol'},
              language.$(capsule, 'nextSymbol')),

            html.tag('span', {class: 'chronology-text'},
              language.sanitize(data.nextName)),
          ],
        }),
      ])),
};
