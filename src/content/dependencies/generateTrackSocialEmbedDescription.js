import {empty} from '#sugar';

export default {
  extraDependencies: ['html', 'language'],

  data: (track) => ({
    artistNames:
      track.artistContribs
        .map(contrib => contrib.artist.name),

    coverArtistNames:
      track.coverArtistContribs
        .map(contrib => contrib.artist.name),
  }),

  generate: (data, {html, language}) =>
    language.encapsulate('trackPage.socialEmbed.body', baseCapsule =>
      language.encapsulate(baseCapsule, workingCapsule => {
        const workingOptions = {};

        if (!empty(data.artistNames)) {
          workingCapsule += '.withArtists';
          workingOptions.artists =
            language.formatConjunctionList(data.artistNames);
        }

        if (!empty(data.coverArtistNames)) {
          workingCapsule += '.withCoverArtists';
          workingOptions.coverArtists =
            language.formatConjunctionList(data.coverArtistNames);
        }

        if (workingCapsule === baseCapsule) {
          return html.blank();
        } else {
          return language.$(workingCapsule, workingOptions);
        }
      })),
};
