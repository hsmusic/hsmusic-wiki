import {empty, stitchArrays} from '#sugar';

export default {
  contentDependencies: ['linkTrack', 'linkContribution'],

  extraDependencies: ['html', 'language'],

  relations: (relation, tracks) => ({
    trackLinks:
      tracks
        .map(track => relation('linkTrack', track)),

    contributionLinks:
      tracks
        .map(track =>
          track.artistContribs
            .map(contrib => relation('linkContribution', contrib))),
  }),

  slots: {
    showContribution: {type: 'boolean', default: false},
    showIcons: {type: 'boolean', default: false},
  },

  generate: (relations, slots, {html, language}) =>
    html.tag('ul',
      {[html.onlyIfContent]: true},

      stitchArrays({
        trackLink: relations.trackLinks,
        contributionLinks: relations.contributionLinks,
      }).map(({trackLink, contributionLinks}) =>
          html.tag('li',
            language.encapsulate('trackList.item', itemCapsule =>
              language.encapsulate(itemCapsule, workingCapsule => {
                const workingOptions = {track: trackLink};

                if (!empty(contributionLinks)) {
                  workingCapsule += '.withArtists';
                  workingOptions.by =
                    html.tag('span', {class: 'by'},
                      html.metatag('chunkwrap', {split: ','},
                        language.$(itemCapsule, 'withArtists.by', {
                          artists:
                            language.formatConjunctionList(
                              contributionLinks.map(link =>
                                link.slots({
                                  showContribution: slots.showContribution,
                                  showIcons: slots.showIcons,
                                }))),
                        })));
                }

                return language.$(workingCapsule, workingOptions);
              }))))),
};
