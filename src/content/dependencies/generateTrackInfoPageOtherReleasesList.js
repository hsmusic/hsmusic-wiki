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
            }).map(({trackLink, albumName}) =>
                trackLink.slots({
                  content: language.sanitize(albumName),
                }))),
      })),
};
