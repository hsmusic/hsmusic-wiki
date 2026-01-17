function sameDay(musicVideo, thing) {
  if (!musicVideo.dateIsSpecified) return null;

  const compare = (a, b) =>
    a.toDateString() === b.toDateString();

  const album = thing.isTrack ? thing.album : thing;
  const track = thing.isTrack ? thing : null;

  if (compare(musicVideo.date, album.date)) {
    if (album.style === 'single') {
      return 'single';
    } else {
      return 'album';
    }
  }

  if (compare(musicVideo.date, track.date)) {
    return 'track';
  }

  return null;
}

export default {
  data: (musicVideo, thing) => ({
    date:
      musicVideo.date,

    dateIsSpecified:
      musicVideo.dateIsSpecified,

    sameDay:
      sameDay(musicVideo, thing),
  }),

  generate: (data, {language}) =>
    language.encapsulate('misc.musicVideo.date', capsule => [
      data.sameDay === 'album' &&
        language.$(capsule, 'sameDayAsAlbum'),

      data.sameDay === 'single' &&
        language.$(capsule, 'sameDayAsTrack'),

      data.sameDay === 'track' &&
        language.$(capsule, 'sameDayAsTrack'),

      data.sameDay === null &&
      data.dateIsSpecified &&
        language.$(capsule, {
          date:
            language.formatDate(data.date),
        }),
    ]),
};
