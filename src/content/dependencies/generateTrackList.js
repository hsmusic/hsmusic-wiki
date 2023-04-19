import {empty} from '../../util/sugar.js';

export default {
  contentDependencies: ['linkTrack', 'linkContribution'],

  extraDependencies: ['html', 'language'],

  relations(relation, tracks) {
    if (empty(tracks)) {
      return {};
    }

    return {
      items: tracks.map(track => ({
        trackLink:
          relation('linkTrack', track),

        contributionLinks:
          track.artistContribs.map(contrib =>
            relation('linkContribution', contrib.who, contrib.what)),
      })),
    };
  },

  generate(relations, {html, language}) {
    return html.template({
      annotation: `generateTrackList`,

      slots: {
        showContribution: {type: 'boolean', default: false},
        showIcons: {type: 'boolean', default: false},
      },

      content(slots) {
        return html.tag('ul',
          relations.items.map(({trackLink, contributionLinks}) =>
            html.tag('li',
              language.$('trackList.item.withArtists', {
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
              }))));
      },
    });
  },
};
