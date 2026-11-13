import {sortAlbumsTracksChronologically} from '#sort';
import {transposeArrays, unique} from '#sugar';

export default {
  sprawl: ({seriesData}) => ({seriesData}),

  query(sprawl, album, track) {
    const query = {};

    query.groups =
      (track ? unique([...track.ownGroups, ...track.groups]) :
       album.groups);

    const includedInSeries = series =>
      series.things.includes(album) ||
      series.things.includes(track);

    query.groupSerieses =
      query.groups
        .map(group =>
          group.serieses
            .filter(series => includedInSeries(series)));

    const allGroupSerieses =
      query.groupSerieses.flat();

    query.disconnectedSerieses =
      sprawl.seriesData
        .filter(series => includedInSeries(series))
        .filter(series => !allGroupSerieses.includes(series));

    if (track) {
      const albumTrackMap =
        new Map(transposeArrays([
          track.allReleases.map(t => t.album),
          track.allReleases,
        ]));

      const allReleaseAlbums =
        sortAlbumsTracksChronologically(
          Array.from(albumTrackMap.keys()),
          {getDate: album => albumTrackMap.get(album).date});

      const metaLike =
        (album.style === 'meta'
          ? album => album.style === 'meta'
          : album => album.style !== 'meta');

      const metaUnlike =
        (album.style === 'meta'
          ? album => album.style !== 'meta'
          : album => album.style === 'meta');

      const metaReleaseAlbums =
        allReleaseAlbums.filter(metaUnlike);

      const regularReleaseAlbums =
        allReleaseAlbums.filter(metaLike);

      const currentReleaseIndex =
        regularReleaseAlbums.indexOf(track.album);

      const earlierReleaseAlbums =
        regularReleaseAlbums.slice(0, currentReleaseIndex);

      const laterReleaseAlbums =
        regularReleaseAlbums.slice(currentReleaseIndex + 1);

      query.earlierReleaseTracks =
        earlierReleaseAlbums.map(album => albumTrackMap.get(album));

      query.laterReleaseTracks =
        laterReleaseAlbums.map(album => albumTrackMap.get(album));

      query.metaReleaseTracks =
        metaReleaseAlbums.map(album => albumTrackMap.get(album));
    }

    return query;
  },

  relations: (relation, query, _sprawl, album, track) => ({
    sidebar:
      relation('generatePageSidebar'),

    trackListBox:
      relation('generateAlbumSidebarTrackListBox', album, track),

    trackGroupBoxes:
      relation('generateAlbumSidebarGroupBoxes', album, track),

    albumGroupBoxes:
      relation('generateAlbumSidebarGroupBoxes', album),

    earlierTrackReleaseBoxes:
      (track
        ? query.earlierReleaseTracks
            .map(track =>
              relation('generateTrackReleaseBox', track))
        : null),

    laterTrackReleaseBoxes:
      (track
        ? query.laterReleaseTracks
            .map(track =>
              relation('generateTrackReleaseBox', track))
        : null),

    metaReleaseBoxes:
      (track
        ? query.metaReleaseTracks
            .map(track =>
              relation('generateTrackReleaseBox', track))
        : null),
  }),

  data: (query, _sprawl, album, track) => ({
    isAlbumPage: !track,
    isTrackPage: !!track,

    albumStyle: album.style,

    groupsCollapse:
      query.groups
        .map(group => group.collapseInAlbumSidebars),
  }),

  generate(data, relations, {html}) {
    const presentGroupsLikeAlbum =
      data.isAlbumPage ||
      data.albumStyle === 'single';

    for (const boxes of [relations.albumGroupBoxes, relations.trackGroupBoxes]) {
      boxes.setSlot('mode', presentGroupsLikeAlbum ? 'album' : 'track');
    }

    return relations.sidebar.slots({
      boxes:
        html.tags([
          html.tags([
            data.isAlbumPage &&
              relations.albumGroupBoxes,

            data.isTrackPage &&
              relations.earlierTrackReleaseBoxes,

            relations.trackListBox,

            data.isTrackPage &&
              relations.laterTrackReleaseBoxes,

            data.isTrackPage &&
              relations.metaReleaseBoxes
                .map(box => box.slot('meta', true)),
          ]),

          data.isTrackPage &&
            relations.trackGroupBoxes,

          data.isTrackPage &&
            relations.albumGroupBoxes,
        ], {[html.joinChildren]: html.tag('hr')}),
    });
  },
};
