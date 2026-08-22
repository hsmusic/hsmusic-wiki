import {sortAlbumsTracksChronologically} from '#sort';
import {empty, stitchArrays} from '#sugar';

export default {
  sprawl: ({trackData}) => ({trackData}),

  query({trackData}, spec) {
    const query = {spec};

    query.mainReleaseTracks =
      sortAlbumsTracksChronologically(
        trackData.filter(track => !empty(track.secondaryReleases)));

    query.allReleaseTracks =
      query.mainReleaseTracks
        .map(track => track.allReleases);

    return query;
  },

  relations: (relation, query) => ({
    page:
      relation('generateListingPage', query.spec),

    mainReleaseTrackLinks:
      query.mainReleaseTracks
        .map(track => relation('linkTrack', track)),

    mainReleaseTrackCredits:
      query.mainReleaseTracks.map(track =>
        relation('generateArtistCredit',
          track.artistContribs,
          [],
          track.artistTextInLists)),

    releaseTrackLinks:
      query.allReleaseTracks
        .map(tracks => tracks
          .map(track => relation('linkTrack', track))),

    releaseTrackCredits:
      stitchArrays({
        mainReleaseTrack: query.mainReleaseTracks,
        allReleaseTracks: query.allReleaseTracks,
      }).map(({mainReleaseTrack, allReleaseTracks}) =>
          allReleaseTracks.map(track =>
            relation('generateArtistCredit',
              track.artistContribs,
              mainReleaseTrack.artistContribs,
              track.artistTextInLists))),
  }),

  data: (query) => ({
    releaseDates:
      query.allReleaseTracks
        .map(tracks => tracks
          .map(track => track.date)),

    releaseAlbumNames:
      query.allReleaseTracks
        .map(tracks => tracks
          .map(track => track.album.name)),

    releaseDifferingTrackNames:
      stitchArrays({
        mainReleaseTrack: query.mainReleaseTracks,
        allReleaseTracks: query.allReleaseTracks,
      }).map(({
          mainReleaseTrack,
          allReleaseTracks,
        }) =>
          allReleaseTracks.map(track =>
            (track.name !== mainReleaseTrack.name
              ? track.name
              : null))),

    releasesAreMainRelease:
      query.allReleaseTracks
        .map(tracks => tracks
          .map(track => track.isMainRelease)),

    releasesAreSingle:
      query.allReleaseTracks
        .map(tracks => tracks
          .map(track => track.album.style === 'single')),
  }),

  generate: (data, relations, {html, language}) =>
    relations.page.slots({
      type: 'chunks',
      useContentHeadingsForChunks: false,

      chunkTitles:
        stitchArrays({
          trackLink: relations.mainReleaseTrackLinks,
          trackCredit: relations.mainReleaseTrackCredits,
        }).map(({trackLink, trackCredit}) => {
            trackCredit.setSlots({
              normalStringKey: 'trackList.item.artists.by',
              featuringStringKey: 'trackList.item.artists.featuring',
              normalFeaturingStringKey: 'trackList.item.artists.by.featuring',
            });

            if (html.isBlank(trackCredit)) {
              return {
                track: trackLink,
              };
            } else {
              return {
                stringsKey: 'withCredit',
                track: trackLink,
                credit:
                  html.tag('span', {class: 'by'},
                    trackCredit),
              };
            }
          }),

      chunkRowAttributes:
        data.releasesAreMainRelease
          .map(releasesAreMainRelease => releasesAreMainRelease
            .map(isMainRelease =>
              (isMainRelease
                ? {class: 'main-release-row'}
                : null))),

      chunkRows:
        stitchArrays({
          trackLinks: relations.releaseTrackLinks,
          trackCredits: relations.releaseTrackCredits,
          albumNames: data.releaseAlbumNames,
          dates: data.releaseDates,
          differingTrackNames: data.releaseDifferingTrackNames,
          releasesAreMainRelease: data.releasesAreMainRelease,
          releasesAreSingle: data.releasesAreSingle,
        }).map(({
            trackLinks,
            trackCredits,
            albumNames,
            dates,
            differingTrackNames,
            releasesAreMainRelease,
            releasesAreSingle,
          }) =>
            stitchArrays({
              trackLink: trackLinks,
              trackCredit: trackCredits,
              albumName: albumNames,
              date: dates,
              differingTrackName: differingTrackNames,
              isMainRelease: releasesAreMainRelease,
              isSingle: releasesAreSingle,
            }).map(({
                trackLink,
                trackCredit,
                albumName,
                date,
                differingTrackName,
                isMainRelease,
                isSingle,
              }) => {
                trackCredit.setSlots({
                  normalStringKey: 'trackList.item.artists.by',
                  featuringStringKey: 'trackList.item.artists.featuring',
                  normalFeaturingStringKey: 'trackList.item.artists.by.featuring',
                });

                const nameAndCredit =
                  (html.isBlank(trackCredit)
                    ? null
                    : html.tag('span', {class: 'different-credit'},
                        language.$('trackList.item.withArtists', {
                          track: trackLink.clone(),
                          artists:
                            html.tag('span', {class: 'by'},
                              trackCredit),
                        })));

                trackLink.setSlot('content', language.sanitize(albumName));

                if (date) date = language.formatDate(date);
                if (date && isMainRelease) date = html.tag('b', date);

                if (differingTrackName) differingTrackName =
                  html.tag('span', {class: 'different-name'},
                    language.sanitize(differingTrackName));

                if (date) {
                  if (isMainRelease) {
                    return {
                      stringsKey: 'mainRelease',
                      date: date,
                      album: trackLink,
                    };
                  } else if (nameAndCredit) {
                    return {
                      stringsKey: 'differentCredit',
                      date: date,
                      album: trackLink,
                      nameAndCredit: nameAndCredit,
                    };
                  } else if (isSingle) {
                    return {
                      stringsKey: 'single',
                      date: date,
                      album: trackLink,
                    };
                  } else if (differingTrackName) {
                    return {
                      stringsKey: 'differentName',
                      date: date,
                      album: trackLink,
                      name: differingTrackName,
                    };
                  } else {
                    return {
                      date: date,
                      album: trackLink,
                    }
                  }
                } else {
                  if (isMainRelease) {
                    return {
                      stringsKey: 'withoutDate.mainRelease',
                      album: trackLink,
                    };
                  } else if (nameAndCredit) {
                    return {
                      stringsKey: 'withoutDate.differentCredit',
                      album: trackLink,
                      nameAndCredit: nameAndCredit,
                    };
                  } else if (differingTrackName) {
                    return {
                      stringsKey: 'withoutDate.differentName',
                      album: trackLink,
                      name: differingTrackName,
                    };
                  } else {
                    return {
                      stringsKey: 'withoutDate',
                      album: trackLink,
                    };
                  }
                }
              })),
    }),
};
