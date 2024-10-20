import {stitchArrays} from '#sugar';

export default {
  contentDependencies: ['generateArtistCredit', 'linkTrack'],

  extraDependencies: ['html', 'language'],

  relations: (relation, tracks) => ({
    trackLinks:
      tracks
        .map(track => relation('linkTrack', track)),

    artistCredits:
      tracks
        .map(track =>
          relation('generateArtistCredit', track.artistContribs, [])),
  }),

  generate: (relations, {html, language}) =>
    html.tag('ul',
      {[html.onlyIfContent]: true},

      stitchArrays({
        trackLink: relations.trackLinks,
        artistCredit: relations.artistCredits,
      }).map(({trackLink, artistCredit}) =>
          html.tag('li',
            language.encapsulate('trackList.item', itemCapsule =>
              language.encapsulate(itemCapsule, workingCapsule => {
                const workingOptions = {track: trackLink};

                const artistCapsule = language.encapsulate(itemCapsule, 'withArtists');

                artistCredit.setSlots({
                  normalStringKey:
                    artistCapsule + '.by',

                  featuringStringKey:
                    artistCapsule + '.featuring',

                  normalFeaturingStringKey:
                    artistCapsule + '.by.featuring',
                });

                if (!html.isBlank(artistCredit)) {
                  workingCapsule += '.withArtists';
                  workingOptions.by =
                    html.tag('span', {class: 'by'},
                      html.metatag('chunkwrap', {split: ','},
                        html.resolve(artistCredit)));
                }

                return language.$(workingCapsule, workingOptions);
              }))))),
};
