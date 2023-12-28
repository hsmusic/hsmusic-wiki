import {empty} from '#sugar';

export default function groupTracksByGroup(tracks, groups) {
  const lists = new Map(groups.map(group => [group, []]));
  lists.set('other', []);

  for (const track of tracks) {
    const containingGroups =
      groups.filter(group => group.albums.includes(track.album));

    if (empty(containingGroups)) {
      lists.get('other').push(track);
    } else {
      for (const group of containingGroups) {
        lists.get(group).push(track);
      }
    }
  }

  for (const [key, tracks] of lists.entries()) {
    if (empty(tracks)) {
      lists.delete(key);
    }
  }

  return lists;
}
