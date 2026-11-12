import {stitchArrays, transposeArrays} from '#sugar';

export default {
  relations: (relation, album) => ({
    contentHeading:
      relation('generateContentHeading'),

    albumColorStyle:
      relation('generateColorStyleAttribute', album.color),

    trackSectionColorStyles:
      album.trackSections
        .map(section =>
          (section.color === album.color
            ? relation('generateColorStyleAttribute', section.color)
            : null)),

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

  slots: {
    color: {type: 'boolean', default: false},

    showArtists: {type: 'boolean', default: true},
    showDuration: {type: 'boolean', default: true},

    showTrackSections: {
      validate: v => v.is(true, false, 'divided'),
      default: true,
    },
  },

  generate(data, relations, slots, {html}) {
    const trackLists =
      relations.trackSectionTrackLists
        .map(list => list.slots({
          collapseDurationScope: 'album',
          showArtists: (slots.showArtists ? data.showTrackArtists : false),
          showDuration: slots.showDuration,
        }));

    if (
      slots.showTrackSections === false ||
      !data.hasSubstantialTrackSections
    ) {
      const list =
        html.tag('div', {class: 'album-track-list'},
          {[html.onlyIfContent]: true},
          relations.albumColorStyle,
          trackLists);

      return list;
    }

    if (slots.showTrackSections === 'divided') {
      const list =
        html.tag('div', {class: 'album-track-list'},
          {[html.onlyIfContent]: true},
          {[html.joinChildren]:
            html.tag('hr', {class: 'track-section-division-placeholder'})},
          relations.albumColorStyle,
          trackLists);

      return list;
    }

    const headings =
      stitchArrays({
        title: relations.trackSectionTitles,
        colorStyle: relations.trackSectionColorStyles,
        directory: data.trackSectionDirectories,
        startsRun: data.trackSectionsStartRuns,
      }).map(({title, colorStyle, directory, startsRun}) =>
          relations.contentHeading.cloneWithSlots({
            tag: 'dt',

            attributes: [
              {id: 'sec-' + directory},

              startsRun &&
                {class: 'starts-run'},

              colorStyle,
            ],

            title:
              title.cloneWithSlots({mode: 'content', detail: 'duration'}),

            stickyTitle:
              title.cloneWithSlots({mode: 'content'}),
          }));

    const colorStyles = relations.trackSectionColorStyles;

    const descriptions =
      relations.trackSectionDescriptions
        .map(description =>
          html.tag('blockquote', {[html.onlyIfContent]: true},
            description));

    const list =
      html.tag('dl', {class: 'album-track-section-list'},
        relations.albumColorStyle,

        transposeArrays([headings, colorStyles, descriptions, trackLists])
          .map(([heading, colorStyle, description, trackList]) => [
            heading,
            html.tag('dd', colorStyle, [description, trackList]),
          ]));

    return list;
  },
};
