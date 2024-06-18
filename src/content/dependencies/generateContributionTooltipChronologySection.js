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

  generate: (relations, {html, language}) =>
    language.encapsulate('misc.artistLink.chronology', capsule => [
      html.tag('span', {class: 'chronology-link'},
        {[html.onlyIfContent]: true},

        language.$(capsule, 'previous', {
          [language.onlyIfOptions]: ['thing'],

          thing: relations.previousLink,
        })),

      html.tag('span', {class: 'chronology-link'},
        {[html.onlyIfContent]: true},

        language.$(capsule, 'next', {
          [language.onlyIfOptions]: ['thing'],

          thing: relations.nextLink,
        })),
    ]),
};
