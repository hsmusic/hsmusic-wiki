import {compareArrays, empty} from '#sugar';

export default {
  contentDependencies: [
    'generateAlbumTrackListMissingDuration',
    'generateArtistCredit',
    'linkTrack',
  ],

  extraDependencies: ['getColors', 'html', 'language'],

  query(track, album) {
    const query = {};

    query.duration = track.duration ?? 0;

    query.trackHasDuration = !!track.duration;

    query.sectionHasDuration =
      !album.trackSections
        .some(section =>
          section.tracks.every(track => !track.duration) &&
          section.tracks.includes(track));

    query.albumHasDuration =
      album.tracks.some(track => track.duration);

    return query;
  },

  relations(relation, query, track) {
    const relations = {};

    relations.credit =
      relation('generateArtistCredit',
        track.artistContribs,
        track.album.artistContribs);

    relations.trackLink =
      relation('linkTrack', track);

    if (!query.trackHasDuration) {
      relations.missingDuration =
        relation('generateAlbumTrackListMissingDuration');
    }

    return relations;
  },

  data(query, track, album) {
    const data = {};

    data.duration = query.duration;
    data.trackHasDuration = query.trackHasDuration;
    data.sectionHasDuration = query.sectionHasDuration;
    data.albumHasDuration = query.albumHasDuration;

    if (track.color !== album.color) {
      data.color = track.color;
    }

    data.showArtists =
      !empty(track.artistContribs) &&
       (empty(album.artistContribs) ||
        !compareArrays(
          track.artistContribs.map(contrib => contrib.artist),
          album.artistContribs.map(contrib => contrib.artist),
          {checkOrder: false}));

    return data;
  },

  slots: {
    collapseDurationScope: {
      validate: v =>
        v.is('never', 'track', 'section', 'album'),

      default: 'album',
    },
  },

  generate: (data, relations, slots, {getColors, html, language}) =>
    language.encapsulate('trackList.item', itemCapsule =>
      html.tag('li',
        data.color &&
          {style: `--primary-color: ${getColors(data.color).primary}`},

        language.encapsulate(itemCapsule, workingCapsule => {
          const workingOptions = {};

          workingOptions.track =
            relations.trackLink
              .slot('color', false);

          const collapseDuration =
            (slots.collapseDurationScope === 'track'
              ? !data.trackHasDuration
           : slots.collapseDurationScope === 'section'
              ? !data.sectionHasDuration
           : slots.collapseDurationScope === 'album'
              ? !data.albumHasDuration
              : false);

          if (!collapseDuration) {
            workingCapsule += '.withDuration';
            workingOptions.duration =
              (data.trackHasDuration
                ? language.$(itemCapsule, 'withDuration.duration', {
                    duration:
                      language.formatDuration(data.duration),
                  })
                : relations.missingDuration);
          }

          const artistCapsule = language.encapsulate(itemCapsule, 'withArtists');

          relations.credit.setSlots({
            normalStringKey:
              artistCapsule + '.by',

            featuringStringKey:
              artistCapsule + '.featuring',

            normalFeaturingStringKey:
              artistCapsule + '.by.featuring',
          });

          if (!html.isBlank(relations.credit)) {
            workingCapsule += '.withArtists';
            workingOptions.by =
              html.tag('span', {class: 'by'},
                html.metatag('chunkwrap', {split: ','},
                  html.resolve(relations.credit)));
          }

          return language.$(workingCapsule, workingOptions);
        }))),
};
