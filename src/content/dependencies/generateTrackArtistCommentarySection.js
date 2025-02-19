import {empty, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateCommentaryEntry',
    'generateContentHeading',
    'linkAlbum',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language'],

  query: (track) => ({
    otherRereleasesWithCommentary:
      track.otherReleases
        .filter(track => !track.isOriginalRelease)
        .filter(track => !empty(track.commentary)),
  }),

  relations: (relation, query, track) => ({
    contentHeading:
      relation('generateContentHeading'),

    originalReleaseTrackLink:
      (track.isRerelease
        ? relation('linkTrack', track.originalReleaseTrack)
        : null),

    originalReleaseArtistCommentaryEntries:
      (track.isRerelease
        ? track.originalReleaseTrack.commentary
            .map(entry => relation('generateCommentaryEntry', entry))
        : null),

    thisReleaseAlbumLink:
      relation('linkAlbum', track.album),

    artistCommentaryEntries:
      track.commentary
        .map(entry => relation('generateCommentaryEntry', entry)),

    otherReleaseTrackLinks:
      query.otherRereleasesWithCommentary
        .map(track => relation('linkTrack', track)),
  }),

  data: (query, track) => ({
    name:
      track.name,

    isRerelease:
      track.isRerelease,

    originalReleaseName:
      (track.isRerelease
        ? track.originalReleaseTrack.name
        : null),

    originalReleaseAlbumName:
      (track.isRerelease
        ? track.originalReleaseTrack.album.name
        : null),

    originalReleaseAlbumColor:
      (track.isRerelease
        ? track.originalReleaseTrack.album.color
        : null),

    otherReleaseAlbumNames:
      query.otherRereleasesWithCommentary
        .map(track => track.album.name),

    otherReleaseAlbumColors:
      query.otherRereleasesWithCommentary
        .map(track => track.album.color),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('misc.artistCommentary', capsule =>
      html.tags([
        relations.contentHeading.clone()
          .slots({
            attributes: {id: 'artist-commentary'},
            title: language.$('misc.artistCommentary'),
          }),

        data.isRerelease &&
          html.tags([
            html.tag('p', {class: ['drop', 'commentary-drop']},
              {[html.onlyIfSiblings]: true},

              language.encapsulate(capsule, 'info.fromMainRelease', workingCapsule => {
                const workingOptions = {};

                workingOptions.album =
                  relations.originalReleaseTrackLink.slots({
                    content:
                      data.originalReleaseAlbumName,

                    color:
                      data.originalReleaseAlbumColor,
                  });

                if (data.name !== data.originalReleaseName) {
                  workingCapsule += '.namedDifferently';
                  workingOptions.name =
                    html.tag('i', data.originalReleaseName);
                }

                return language.$(workingCapsule, workingOptions);
              })),

            relations.originalReleaseArtistCommentaryEntries,
          ]),

        html.tags([
          data.isRerelease &&
          !html.isBlank(relations.originalReleaseArtistCommentaryEntries) &&
            html.tag('p', {class: ['drop', 'commentary-drop']},
              {[html.onlyIfSiblings]: true},

              language.$(capsule, 'info.releaseSpecific', {
                album:
                  relations.thisReleaseAlbumLink,
              })),

          relations.artistCommentaryEntries,
        ]),

        html.tag('p', {class: ['drop', 'commentary-drop']},
          {[html.onlyIfContent]: true},

          language.encapsulate(capsule, 'info.seeRereleases', workingCapsule => {
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
