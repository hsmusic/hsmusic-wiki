export default {
  relations: (relation, musicVideo) => ({
    artistCredit:
      relation('generateArtistCredit', musicVideo.artistContribs, []),
  }),

  data: (musicVideo) => ({
    label:
      (musicVideo.label !== 'Music video'
        ? musicVideo.label
        : null),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('misc.musicVideo.artistsLine', artistsLineCapsule =>
      language.encapsulate(artistsLineCapsule, workingCapsule => {
        const workingOptions = {[language.onlyIfOptions]: ['credit']};

        if (data.label) {
          workingCapsule += '.customLabel';
          workingOptions.label = data.label;
        }

        workingOptions.credit =
          html.tag('span', {class: 'by'},
            {[html.onlyIfContent]: true},

            relations.artistCredit.slots({
              normalStringKey:
                language.encapsulate(artistsLineCapsule, 'credit'),

              showAnnotation: true,
              showChronology: true,

              chronologyKind: 'musicVideo',
            }));

        return language.$(workingCapsule, workingOptions);
      })),
};
