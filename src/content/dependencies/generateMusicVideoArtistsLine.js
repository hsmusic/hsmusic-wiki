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

  generate(data, relations, {html, language}) {
    const {artistCredit} = relations;
    const capsule = language.encapsulate('misc.musicVideo');

    let artistsLineCapsule = language.encapsulate(capsule, 'artistsLine');
    let artistsLineOptions = {[language.onlyIfOptions]: ['credit']};

    if (data.label) {
      artistsLineCapsule += '.customLabel';
      artistsLineOptions.label = data.label;
    }

    artistsLineOptions.credit =
      html.tag('span', {class: 'by'},
        {[html.onlyIfContent]: true},

        artistCredit.slots({
          normalStringKey: language.encapsulate(capsule, 'artistsLine.credit'),

          showAnnotation: true,
          showChronology: true,

          chronologyKind: 'musicVideo',
        }));

    return language.$(artistsLineCapsule, artistsLineOptions);
  },
}
