import {empty, stitchArrays} from '#sugar';

export default {
  contentDependencies: ['linkTrack', 'linkContribution'],

  extraDependencies: ['html', 'language'],

  relations(relation, tracks) {
    if (empty(tracks)) {
      return {};
    }

    return {
      trackLinks:
        tracks
          .map(track => relation('linkTrack', track)),

      contributionLinks:
        tracks
          .map(track =>
            (empty(track.artistContribs)
              ? null
              : track.artistContribs
                  .map(contrib => relation('linkContribution', contrib)))),
    };
  },

  slots: {
    showContribution: {type: 'boolean', default: false},
    showIcons: {type: 'boolean', default: false},
  },

  generate(relations, slots, {html, language}) {
    return (
      html.tag('ul',
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
                        language.$('trackList.item.withArtists.by', {
                          artists:
                            language.formatConjunctionList(
                              contributionLinks.map(link =>
                                link.slots({
                                  showContribution: slots.showContribution,
                                  showIcons: slots.showIcons,
                                }))),
                        })),
                  }))))));
  },
};
