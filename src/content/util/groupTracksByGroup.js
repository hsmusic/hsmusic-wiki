import {empty} from '../../util/sugar.js';

export default function groupTracksByGroup(tracks, groups) {
  const lists = new Map(groups.map(group => [group, []]));
  lists.set('other', []);

  for (const track of tracks) {
    const group = groups.find(group => group.albums.includes(track.album));
    if (group) {
      lists.get(group).push(track);
    } else {
      other.get('other').push(track);
    }
  }

  for (const [key, tracks] of lists.entries()) {
    if (empty(tracks)) {
      lists.delete(key);
    }
  }

  return lists;
}
