import {stitchArrays} from '#sugar';

export default {
  contentDependencies: ['linkTrack'],
  extraDependencies: ['html', 'language'],

  relations: (relation, track) => ({
    trackLinks:
      track.otherReleases
        .map(track => relation('linkTrack', track)),
  }),

  data: (track) => ({
    albumNames:
      track.otherReleases
        .map(track => track.album.name),

    albumColors:
      track.otherReleases
        .map(track => track.album.color),
  }),

  generate: (data, relations, {html, language}) =>
    html.tag('p',
      {[html.onlyIfContent]: true},

      language.$('releaseInfo.alsoReleasedOn', {
        [language.onlyIfOptions]: ['albums'],

        albums:
          language.formatConjunctionList(
            stitchArrays({
              trackLink: relations.trackLinks,
              albumName: data.albumNames,
              albumColor: data.albumColors,
            }).map(({trackLink, albumName, albumColor}) =>
                trackLink.slots({
                  content: language.sanitize(albumName),
                  color: albumColor,
                }))),
      })),
};
