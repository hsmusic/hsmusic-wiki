import {empty} from '../../util/sugar.js';

import groupTracksByGroup from '../util/groupTracksByGroup.js';

export default {
  contentDependencies: ['linkTrack', 'linkContribution'],

  extraDependencies: ['html', 'language'],

  relations(relation, tracks, groups) {
    if (empty(tracks)) {
      return {};
    }

    const trackRelations = track => ({
      trackLink:
        relation('linkTrack', track),

      contributionLinks:
        track.artistContribs.map(contrib =>
          relation('linkContribution', contrib.who, contrib.what)),
    });

    if (empty(groups)) {
      return {
        flatItems: tracks.map(trackRelations),
      };
    }

    const lists = groupTracksByGroup(tracks, groups);

    return {
      groupedItems:
        Array.from(lists.entries()).map(([groupOrOther, tracks]) => ({
          ...(groupOrOther === 'other'
                ? {other: true}
                : {groupLink: relation('linkGroup', groupOrOther)}),

          items: tracks.map(trackRelations),
        })),
    };
  },

  generate(relations, {html, language}) {
    // TODO: This is copy-pasted from generateTrackInfoPageContent, seems bad

    const formatContributions =
      (contributionLinks, {showContribution = true, showIcons = true} = {}) =>
        language.formatConjunctionList(
          contributionLinks.map(link =>
            link.slots({showContribution, showIcons})));

    const formatTrackItem = ({trackLink, contributionLinks}) =>
      html.tag('li',
        language.$('trackList.item.withArtists', {
          track: trackLink,
          by:
            html.tag('span', {class: 'by'},
              language.$('trackList.item.withArtists.by', {
                artists:
                  formatContributions(contributionLinks, {
                    showContribution: false,
                    showIcons: false,
                  }),
              })),
        }));

    if (relations.flatItems) {
      return html.tag('ul',
        relations.flatItems.map(formatTrackItem));
    }

    return html.tag('dl',
      relations.groupedItems.map(({other, groupLink, items}) => [
        html.tag('dt',
          (other
            ? language.$('trackList.group.fromOther')
            : language.$('trackList.group', {
                group: groupLink
              }))),

        html.tag('dd',
          html.tag('ul',
            items.map(formatTrackItem))),
      ]));
  },
};
