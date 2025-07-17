import {empty, stitchArrays} from '#sugar';
import {getTotalDuration} from '#wiki-data';

export default {
  contentDependencies: [
    'generateArtistCredit',
    'generateCoverGrid',
    'image',
    'linkAlbum',
  ],

  extraDependencies: ['language', 'wikiData'],

  query: (albums, group) => ({
    notedGroups:
      albums.map(album => {
        const contextGroup = group;

        const candidateGroups =
          album.groups
            .filter(group => !group.excludeFromGalleryTabs)
            .filter(group => group.category !== contextGroup.category);

        return candidateGroups.at(0) ?? null;
      }),

    notedArtistContribs:
      albums.map(album => {
        if (
          album.artistContribs.length === 1 &&
          !empty(group.closelyLinkedArtists) &&
          (album.artistContribs[0].artist.name ===
           group.closelyLinkedArtists[0].artist.name)
        ) {
          return [];
        }

        return album.artistContribs;
      }),
  }),

  relations: (relation, query, albums, _group) => ({
    coverGrid:
      relation('generateCoverGrid'),

    artistCredits:
      query.notedArtistContribs
        .map(contribs => relation('generateArtistCredit', contribs, [])),

    links:
      albums
        .map(album => relation('linkAlbum', album)),

    images:
      albums
        .map(album =>
          (album.hasCoverArt
            ? relation('image', album.coverArtworks[0])
            : relation('image')))
  }),

  data: (query, albums, group) => ({
    names:
      albums.map(album => album.name),

    styles:
      albums.map(album => album.style),

    tracks:
      albums.map(album => album.tracks.length),

    durations:
      albums.map(album =>
        (album.hideDuration
          ? null
          : getTotalDuration(album.tracks))),

    groupNames:
      query.notedGroups
        .map(group => group ? group.name : null),

    notFromThisGroup:
      albums.map(album => !album.groups.includes(group)),
  }),

  generate: (data, relations, {language}) =>
    language.encapsulate('misc.coverGrid', capsule =>
      relations.coverGrid.slots({
        links: relations.links,
        names: data.names,
        notFromThisGroup: data.notFromThisGroup,

        images:
          stitchArrays({
            image: relations.images,
            name: data.names,
          }).map(({image, name}) =>
              image.slots({
                missingSourceContent:
                  language.$(capsule, 'noCoverArt', {
                    album: name,
                  }),
              })),

        itemAttributes:
          data.styles.map(style => ({'data-style': style})),

        tab:
          language.encapsulate(capsule, 'tab', capsule =>
            stitchArrays({
              groupName: data.groupNames,
              artistCredit: relations.artistCredits,
            }).map(({groupName, artistCredit}) =>
                (groupName
                  ? language.$(capsule, 'group', {
                      group: groupName,
                    })
               : artistCredit
                  ? artistCredit?.slots({
                      normalStringKey:
                        capsule + '.artists',

                      normalFeaturingStringKey:
                        capsule + '.artists.featuring',
                    })
                  : null))),

        info:
          stitchArrays({
            style: data.styles,
            tracks: data.tracks,
            duration: data.durations,
          }).map(({style, tracks, duration}) =>
              (style === 'single' && duration
                ? language.$(capsule, 'details.albumLength.single', {
                    time: language.formatDuration(duration),
                  })
             : duration
                ? language.$(capsule, 'details.albumLength', {
                    tracks: language.countTracks(tracks, {unit: true}),
                    time: language.formatDuration(duration),
                  })
                : null)),
      })),
};
