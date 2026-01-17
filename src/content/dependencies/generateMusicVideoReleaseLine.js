export default {
  relations: (relation, musicVideo, thing) => ({
    datetimestamp:
      relation('generateAbsoluteDatetimestamp', musicVideo.date, thing.date),

    artistCredit:
      relation('generateArtistCredit', musicVideo.artistContribs, []),
  }),

  data: (data) => ({
    label:
      (data.label !== 'Music video'
        ? data.label
        : null),
  }),

  generate(data, relations, {html, language}) {
    const {artistCredit, datetimestamp} = relations;
    const capsule = language.encapsulate('misc.musicVideo');

    datetimestamp.setSlot('style', 'year-difference');

    let artistsLineCapsule = language.encapsulate(capsule, 'artistsLine');
    let artistsLineOptions = {[language.onlyIfOptions]: ['credit']};

    if (data.label) {
      artistsLineCapsule += '.customLabel';
      artistsLineOptions.label = data.label;
    }

    if (!html.isBlank(datetimestamp)) {
      artistsLineCapsule += '.withDate';
      artistsLineOptions.date = datetimestamp;
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

    const artistsLine = language.$(artistsLineCapsule, artistsLineOptions);

    if (!html.isBlank(artistsLine)) {
      return artistsLine;
    }

    if (!html.isBlank(datetimestamp)) {
      return language.$(capsule, 'date', {date: datetimestamp});
    }

    return html.blank();
  },
}
