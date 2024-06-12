import {stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateAbsoluteDatetimestamp',
    'generateColorStyleAttribute',
    'generateRelativeDatetimestamp',
    'linkAlbum',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, track) => ({
    colorStyles:
      track.otherReleases
        .map(track => relation('generateColorStyleAttribute', track.color)),

    trackLinks:
      track.otherReleases
        .map(track => relation('linkTrack', track)),

    albumLinks:
      track.otherReleases
        .map(track => relation('linkAlbum', track.album)),

    datetimestamps:
      track.otherReleases.map(track2 =>
        (track2.date
          ? (track.date
              ? relation('generateRelativeDatetimestamp',
                  track2.date,
                  track.date)
              : relation('generateAbsoluteDatetimestamp',
                  track2.date))
          : null)),

    items:
      track.otherReleases.map(track => ({
        trackLink: relation('linkTrack', track),
        albumLink: relation('linkAlbum', track.album),
      })),
  }),

  generate: (relations, {html, language}) =>
    html.tag('ul',
      {[html.onlyIfContent]: true},

      stitchArrays({
        trackLink: relations.trackLinks,
        albumLink: relations.albumLinks,
        datetimestamp: relations.datetimestamps,
        colorStyle: relations.colorStyles,
      }).map(({
          trackLink,
          albumLink,
          datetimestamp,
          colorStyle,
        }) => {
          const parts = ['releaseInfo.alsoReleasedAs.item'];
          const options = {};

          options.track = trackLink.slot('color', false);
          options.album = albumLink;

          if (datetimestamp) {
            parts.push('withYear');
            options.year =
              datetimestamp.slots({
                style: 'year',
                tooltip: true,
              });
          }

          return (
            html.tag('li',
              colorStyle,
              language.$(...parts, options)));
        })),
};
