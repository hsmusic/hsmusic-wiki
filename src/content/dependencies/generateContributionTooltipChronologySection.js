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

  slots: {
    kind: {
      validate: v =>
        v.is(
          'album',
          'bannerArt',
          'coverArt',
          'flash',
          'track',
          'trackArt',
          'trackContribution',
          'wallpaperArt'),
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('misc.artistLink.chronology', capsule =>
      html.tags([
        html.tags([
          relations.previousLink?.slots({
            attributes: {class: 'chronology-link'},
            content: [
              html.tag('span', {class: 'chronology-symbol'},
                language.$(capsule, 'previous.symbol')),

              html.tag('span', {class: 'chronology-text'},
                language.sanitize(data.previousName)),
            ],
          }),

          html.tag('span', {class: 'chronology-info'},
            {[html.onlyIfSiblings]: true},

            language.encapsulate(capsule, 'previous.info', workingCapsule => {
              const workingOptions = {};

              if (slots.kind) {
                workingCapsule += '.withKind';
                workingOptions.kind =
                  language.$(capsule, 'kind', slots.kind);
              }

              return language.$(workingCapsule, workingOptions);
            })),
        ]),

        html.tags([
          relations.nextLink?.slots({
            attributes: {class: 'chronology-link'},
            content: [
              html.tag('span', {class: 'chronology-symbol'},
                language.$(capsule, 'next.symbol')),

              html.tag('span', {class: 'chronology-text'},
                language.sanitize(data.nextName)),
            ],
          }),

          html.tag('span', {class: 'chronology-info'},
            {[html.onlyIfSiblings]: true},

            language.encapsulate(capsule, 'next.info', workingCapsule => {
              const workingOptions = {};

              if (slots.kind) {
                workingCapsule += '.withKind';
                workingOptions.kind =
                  language.$(capsule, 'kind', slots.kind);
              }

              return language.$(workingCapsule, workingOptions);
            }))
        ]),
      ])),
};
