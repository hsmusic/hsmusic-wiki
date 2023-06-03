import {empty} from '../../util/sugar.js';

import groupTracksByGroup from '../util/groupTracksByGroup.js';

export default {
  contentDependencies: ['generateTrackList', 'linkGroup'],
  extraDependencies: ['html', 'language'],

  relations(relation, tracks, groups) {
    if (empty(tracks)) {
      return {};
    }

    if (empty(groups)) {
      return {
        flatList:
          relation('generateTrackList', tracks),
      };
    }

    const lists = groupTracksByGroup(tracks, groups);

    return {
      groupedLists:
        Array.from(lists.entries()).map(([groupOrOther, tracks]) => ({
          ...(groupOrOther === 'other'
                ? {other: true}
                : {groupLink: relation('linkGroup', groupOrOther)}),

          list:
            relation('generateTrackList', tracks),
        })),
    };
  },

  generate(relations, {html, language}) {
    if (relations.flatList) {
      return relations.flatList;
    }

    return html.tag('dl',
      relations.groupedLists.map(({other, groupLink, list}) => [
        html.tag('dt',
          (other
            ? language.$('trackList.group.fromOther')
            : language.$('trackList.group', {
                group: groupLink
              }))),

        html.tag('dd', list),
      ]));
  },
};
