import {onlyItem, stitchArrays} from '#sugar';

export default {
  query(track) {
    const query = {};

    query.singleSingle =
      onlyItem(
        track.otherReleases.filter(track => track.album.style === 'single'));

    query.regularReleases =
      (query.singleSingle
        ? track.otherReleases.filter(track => track !== query.singleSingle)
        : track.otherReleases);

    return query;
  },

  relations: (relation, query, track) => ({
    textWithTooltip:
      relation('generateTextWithTooltip'),

    singleLink:
      (query.singleSingle
        ? relation('linkTrack', query.singleSingle)
        : null),

    singleTooltip:
      (query.singleSingle
        ? relation('generateTrackInfoPageOtherReleaseTooltip',
            query.singleSingle, track)
        : null),

    trackLinks:
      query.regularReleases
        .map(track => relation('linkTrack', track)),

    trackTooltips:
      query.regularReleases
        .map(otherTrack =>
          relation('generateTrackInfoPageOtherReleaseTooltip',
            otherTrack, track)),
  }),

  data: (query, _track) => ({
    albumNames:
      query.regularReleases
        .map(track => track.album.name),

    albumColors:
      query.regularReleases
        .map(track => track.album.color),

    singlePlacement:
      (query.singleSingle
        ? query.singleSingle.trackNumber === 1 ? 'as' : 'on'
        : null),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('releaseInfo.alsoReleased', capsule =>
      language.encapsulate(capsule, workingCapsule => {
        const workingOptions = {};

        let any = false;

        const albumList =
          language.formatConjunctionList(
            stitchArrays({
              trackLink: relations.trackLinks,
              trackTooltip: relations.trackTooltips,
              albumName: data.albumNames,
              albumColor: data.albumColors,
            }).map(({
                trackLink,
                trackTooltip,
                albumName,
                albumColor,
              }) =>
                relations.textWithTooltip.clone().slots({
                  customInteractionCue: true,

                  text:
                    trackLink.slots({
                      attributes: {class: 'text-with-tooltip-interaction-cue'},
                      content: language.sanitize(albumName),
                      color: albumColor,
                    }),

                  tooltip:
                    trackTooltip,
                })));

        if (!html.isBlank(albumList)) {
          any = true;
          workingCapsule += '.onAlbums';
          workingOptions.albums = albumList;
        }

        if (relations.singleLink) {
          any = true;

          const singleStringPart = `${data.singlePlacement}Single`;
          const singleCapsule = language.encapsulate(capsule, singleStringPart);

          workingCapsule += '.' + singleStringPart;
          workingOptions.single =
            relations.textWithTooltip.clone().slots({
              customInteractionCue: true,

              text:
                relations.singleLink.slots({
                  attributes: {class: 'text-with-tooltip-interaction-cue'},
                  content: language.$(singleCapsule, 'link'),
                }),

              tooltip:
                relations.singleTooltip,
            });
        }

        if (any) {
          return language.$(workingCapsule, workingOptions);
        } else {
          return html.blank();
        }
      })),
};
