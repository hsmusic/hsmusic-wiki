import {empty, stitchArrays, transposeArrays} from '#sugar';

export default {
  relations: (relation, album) => ({
    contentHeading:
      relation('generateContentHeading'),

    trackSectionTitles:
      album.trackSections
        .map(section => relation('generateTrackSectionTitle', section)),

    trackSectionTrackLists:
      album.trackSections
        .map(section => relation('generateTrackSectionTrackList', section)),

    trackSectionDescriptions:
      album.trackSections
        .map(section => relation('transformContent', section.description)),
  }),

  data: (album) => ({
    showTrackArtists:
      album.showArtistsInTrackList,

    hasSubstantialTrackSections:
      album.trackSections.length >= 2 ||

      album.trackSections.length === 1 &&
      !album.trackSections[0].isDefaultTrackSection,

    trackSectionDirectories:
      album.trackSections.map(section => section.directoryWithinAlbum),

    trackSectionsStartRuns:
      album.trackSections.map(section => section.startsRun),
  }),

  generate(data, relations, {html}) {
    const trackLists =
      relations.trackSectionTrackLists
        .map(list => list.slots({
          collapseDurationScope: 'album',
          showArtists: data.showTrackArtists,
          showDuration: true,
        }));

    if (data.hasSubstantialTrackSections) {
      const headings =
        stitchArrays({
          title: relations.trackSectionTitles,
          directory: data.trackSectionDirectories,
          startsRun: data.trackSectionsStartRuns,
        }).map(({title, directory, startsRun}) =>
            relations.contentHeading.cloneWithSlots({
              tag: 'dt',

              attributes: [
                {id: 'sec-' + directory},

                startsRun &&
                  {class: 'starts-run'},
              ],

              title:
                title.cloneWithSlots({mode: 'content', detail: 'duration'}),

              stickyTitle:
                title.cloneWithSlots({mode: 'content'}),
            }));

      const descriptions =
        relations.trackSectionDescriptions
          .map(description =>
            html.tag('blockquote', {[html.onlyIfContent]: true},
              description));

      const list =
        html.tag('dl', {class: 'album-track-section-list'},
          transposeArrays([headings, descriptions, trackLists])
            .map(([heading, description, trackList]) => [
              heading,
              html.tag('dd', [description, trackList]),
            ]));

      return list;
    }

    if (!empty(trackLists)) {
      return trackLists[0];
    }

    return html.blank();
  },
};
