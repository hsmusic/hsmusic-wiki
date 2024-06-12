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
            (empty(contributionLinks)
              ? trackLink
              : language.$('trackList.item.withArtists', {
                  track: trackLink,
                  by:
                    html.tag('span', {class: 'by'},
                      html.metatag('chunkwrap', {split: ','},
                        language.$('trackList.item.withArtists.by', {
                          artists:
                            language.formatConjunctionList(
                              contributionLinks.map(link =>
                                link.slots({
                                  showContribution: slots.showContribution,
                                  showIcons: slots.showIcons,
                                }))),
                        }))),
                }))))),
};
