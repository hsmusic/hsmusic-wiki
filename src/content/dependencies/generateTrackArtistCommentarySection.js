import {empty, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateContentContentHeading',
    'generateCommentaryEntry',
    'linkAlbum',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language'],

  query: (track) => ({
    otherSecondaryReleasesWithCommentary:
      track.otherReleases
        .filter(track => !track.isMainRelease)
        .filter(track => !empty(track.commentary)),
  }),

  relations: (relation, query, track) => ({
    contentContentHeading:
      relation('generateContentContentHeading', track),

    mainReleaseTrackLink:
      (track.isSecondaryRelease
        ? relation('linkTrack', track.mainReleaseTrack)
        : null),

    mainReleaseArtistCommentaryEntries:
      (track.isSecondaryRelease
        ? track.commentaryFromMainRelease
            .map(entry => relation('generateCommentaryEntry', entry))
        : null),

    thisReleaseAlbumLink:
      relation('linkAlbum', track.album),

    artistCommentaryEntries:
      track.commentary
        .map(entry => relation('generateCommentaryEntry', entry)),

    otherReleaseTrackLinks:
      query.otherSecondaryReleasesWithCommentary
        .map(track => relation('linkTrack', track)),
  }),

  data: (query, track) => ({
    name:
      track.name,

    isSecondaryRelease:
      track.isSecondaryRelease,

    mainReleaseName:
      (track.isSecondaryRelease
        ? track.mainReleaseTrack.name
        : null),

    mainReleaseAlbumName:
      (track.isSecondaryRelease
        ? track.mainReleaseTrack.album.name
        : null),

    mainReleaseAlbumColor:
      (track.isSecondaryRelease
        ? track.mainReleaseTrack.album.color
        : null),

    otherReleaseAlbumNames:
      query.otherSecondaryReleasesWithCommentary
        .map(track => track.album.name),

    otherReleaseAlbumColors:
      query.otherSecondaryReleasesWithCommentary
        .map(track => track.album.color),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('misc.artistCommentary', capsule =>
      html.tags([
        relations.contentContentHeading.slots({
          attributes: {id: 'artist-commentary'},
          string: 'misc.artistCommentary',
        }),

        relations.artistCommentaryEntries,

        data.isSecondaryRelease &&
          html.tag('div', {class: 'inherited-commentary-section'},
            {[html.onlyIfContent]: true},

            [
              html.tag('p', {class: ['drop', 'commentary-drop']},
                {[html.onlyIfSiblings]: true},

                language.encapsulate(capsule, 'info.fromMainRelease', workingCapsule => {
                  const workingOptions = {};

                  workingOptions.album =
                    relations.mainReleaseTrackLink.slots({
                      content:
                        data.mainReleaseAlbumName,

                      color:
                        data.mainReleaseAlbumColor,
                    });

                  if (data.name !== data.mainReleaseName) {
                    workingCapsule += '.namedDifferently';
                    workingOptions.name =
                      html.tag('i', data.mainReleaseName);
                  }

                  return language.$(workingCapsule, workingOptions);
                })),

              relations.mainReleaseArtistCommentaryEntries,
            ]),

        html.tag('p', {class: ['drop', 'commentary-drop']},
          {[html.onlyIfContent]: true},

          language.encapsulate(capsule, 'info.seeSpecificReleases', workingCapsule => {
            const workingOptions = {};

            workingOptions[language.onlyIfOptions] = ['albums'];

            workingOptions.albums =
              language.formatUnitList(
                stitchArrays({
                  trackLink: relations.otherReleaseTrackLinks,
                  albumName: data.otherReleaseAlbumNames,
                  albumColor: data.otherReleaseAlbumColors,
                }).map(({trackLink, albumName, albumColor}) =>
                    trackLink.slots({
                      content: language.sanitize(albumName),
                      color: albumColor,
                    })));

            if (!html.isBlank(relations.artistCommentaryEntries)) {
              workingCapsule += '.withMainCommentary';
            }

            return language.$(workingCapsule, workingOptions);
          })),
      ])),
};
