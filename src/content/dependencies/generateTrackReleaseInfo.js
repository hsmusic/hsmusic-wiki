import {compareArrays} from '#sugar';

export default {
  relations: (relation, track) => ({
    block:
      relation('generateReleaseInfoBlock'),

    artistContributionsLine:
      relation('generateReleaseInfoContributionsLine',
        track.artistContribs,
        track.artistTextOnOwnPage),

    listenLineOrList:
      relation('generateListenLineOrList', track),

    additionalLinksLineOrList:
      relation('generateExternalLinksLineOrList', track.additionalURLs),

    conjoinStandaloneParagraphs:
      relation('conjoinStandaloneParagraphs'),

    albumLink:
      relation('linkAlbum', track.album),

    datetimestamp:
      relation('generateAbsoluteDatetimestamp', track.date),
  }),

  data(track) {
    const data = {};
    const {album} = track;

    data.name = track.name;

    data.date = track.date;

    data.albumStyle = album.style;

    data.dateFrom =
      (track.date && album.date && +track.date === +album.date
        ? 'album'
     : track.date
        ? 'track'
        : null);

    data.dateStyle =
      (data.dateFrom === 'track'
        ? track.dateStyle
     : data.dateFrom === 'album'
        ? album.dateStyle
        : null);

    data.duration = track.duration;

    if (album.showAlbumInAllTracks) {
      if (+data.date === +album.date) {
        data.showAlbum = 'date';
      } else {
        data.showAlbum = 'last';
      }
    } else if (album.showAlbumInTracksWithoutArtists) {
      if (
        track.artistContribs.every(({annotation}) => !annotation) &&
        compareArrays(
          track.artistContribs.map(({artist}) => artist),
          album.artistContribs.map(({artist}) => artist),
          {checkOrder: true})
      ) {
        data.showAlbum = 'front';
      } else {
        data.showAlbum = false;
      }
    } else {
      data.showAlbum = false;
    }

    return data;
  },

  generate: (data, relations, {html, language}) =>
    language.encapsulate('releaseInfo', capsule =>
      html.tags([
        relations.block.slot('items', [
          language.encapsulate(capsule, 'by', capsule => {
            const withAlbum =
              (data.showAlbum === 'front'
                ? '.withAlbum'
             : data.showAlbum === 'last'
                ? '.withAlbum.albumLast'
                : '');

            const albumOptions =
              (withAlbum ? {album: relations.albumLink} : {});

            return relations.artistContributionsLine.slots({
              stringKey: capsule + withAlbum,
              featuringStringKey: capsule + '.featuring' + withAlbum,

              additionalStringOptions: albumOptions,

              chronologyKind: 'track',
            });
          }),

          language.encapsulate(capsule, workingCapsule => {
            const workingOptions = {};

            if (data.dateStyle === 'released') {
              if (
                data.showAlbum === 'date' &&
                data.albumStyle === 'in-game vgm'
              ) {
                workingCapsule += '.released.vgm';
                workingOptions.date =
                  relations.datetimestamp.slot('style', 'year');
              } else {
                workingCapsule += '.released';
                workingOptions.date = language.formatDate(data.date);
              }
            } else if (data.dateStyle === 'posted') {
              workingCapsule += '.posted';
              workingOptions.date = language.formatDate(data.date);
            } else {
              return html.blank();
            }

            if (data.showAlbum === 'date') {
              workingCapsule += '.withAlbum';
              workingOptions.album = relations.albumLink;
            }

            return language.$(workingCapsule, workingOptions);
          }),

          language.$(capsule, 'duration', {
            [language.onlyIfOptions]: ['duration'],
            duration: language.formatDuration(data.duration),
          }),
        ]),

        relations.conjoinStandaloneParagraphs.slots({
          items: [
            relations.listenLineOrList.slots({
              visibleWithoutLinks: true,
              context: 'track',
            }),

            relations.additionalLinksLineOrList.slots({
              string:
                (html.isBlank(relations.listenLineOrList)
                  ? 'releaseInfo.availableLinks'
                  : 'releaseInfo.moreLinks'),

              inlineListStyle: 'unit',
            }),
          ],
        }),
      ])),
};
