import {stitchArrays} from '#sugar';
import {getKebabCase} from '#wiki-data';

export default {
  relations: (relation, track) => ({
    trackLinks:
      track.followingProductionTracks
        .map(track => relation('linkTrack', track)),

    albumLinks:
      track.followingProductionTracks
        .map(following =>
          (following.album !== track.album &&
           getKebabCase(following.name) === getKebabCase(track.name)

            ? relation('linkAlbum', following.album)
            : null)),
  }),

  generate: (relations, {language}) =>
    language.encapsulate('releaseInfo.previousProduction', capsule =>
      language.$(capsule, {
        [language.onlyIfOptions]: ['tracks'],

        tracks:
          stitchArrays({
            trackLink: relations.trackLinks,
            albumLink: relations.albumLinks,
          }).map(({trackLink, albumLink}) =>
              (albumLink
                ? language.$(capsule, 'trackOnAlbum', {
                    track: trackLink,
                    album: albumLink,
                  })
                : trackLink)),
      })),
};
