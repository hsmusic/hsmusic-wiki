const contributionSlots = {
  showAnnotation: true,
  showChronology: true,
  showExternalLinks: true,
  chronologyKind: 'musicVideoContribution',
};

export default {
  relations: (relation, musicVideo) => ({
    artistCredit:
      relation('generateArtistCredit', musicVideo.contributorContribs, []),

    contributionLinks:
      musicVideo.contributorContribs
        .map(contrib => relation('linkContribution', contrib)),
  }),

  data: (musicVideo) => ({
    style:
      musicVideo.contributorStyle,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('misc.musicVideo', capsule =>
      (data.style === 'list'
        ? html.tag('p',
            {[html.joinChildren]: html.tag('br')},
            {[html.onlyIfContent]: true},

            [
              html.tags([
                language.$(capsule, 'contributorsList.title'),
              ], {[html.onlyIfSiblings]: true}),

              relations.contributionLinks
                .map(link => link.slots({...contributionSlots})),
            ])

     : data.style === 'line'
        ? html.tag('p',
            {[html.onlyIfContent]: true},

              language.$(capsule, 'contributorsLine', {
                [language.onlyIfOptions]: ['credit'],

                credit:
                  relations.artistCredit.slots({
                    normalStringKey:
                      language.encapsulate(capsule, 'contributorsLine.credit'),

                    chunkwrap: false,

                    ...contributionSlots,
                  }),
              }))

        : html.blank())),
};
