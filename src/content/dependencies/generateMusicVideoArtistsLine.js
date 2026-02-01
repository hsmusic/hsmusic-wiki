export default {
  relations: (relation, musicVideo) => ({
    artistCredit:
      relation('generateArtistCredit', musicVideo.artistContribs, []),
  }),

  data: (musicVideo) => ({
    label:
      musicVideo.label,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('misc.musicVideo.artistsLine', artistsLineCapsule =>
      language.encapsulate(artistsLineCapsule, workingCapsule => {
        const credit = relations.artistCredit;

        credit.setSlots({
          normalStringKey:
            language.encapsulate(artistsLineCapsule, 'credit'),

          showAnnotation: true,
          showChronology: true,
          showExternalLinks: true,

          chronologyKind: 'musicVideo',
        });

        if (html.isBlank(credit)) {
          return html.blank();
        }

        if (data.label === 'Music video' || !data.label) {
          credit.setSlots({
            normalStringKey:
              language.encapsulate(artistsLineCapsule, 'noLabel'),
          });

          return credit;
        }

        const workingOptions = {};

        workingOptions.credit =
          html.tag('span', {class: 'by'}, credit);

        if (data.label && data.label !== 'Music video') {
          workingCapsule += '.customLabel';
          workingOptions.label = data.label;
        }

        return language.$(workingCapsule, workingOptions);
      })),
};
