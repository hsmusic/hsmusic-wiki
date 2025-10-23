export default {
  relations: (relation, track) => ({
    previousProductionTrackList:
      relation('generateNearbyTrackList',
        track.previousProductionTracks,
        track,
        track.artistContribs),

    referencedTrackList:
      relation('generateNearbyTrackList',
        track.referencedTracks,
        track,
        []),
  }),

  generate: (relations, {html, language}) =>
    html.tag('ul', {[html.onlyIfContent]: true}, [
      html.inside(relations.previousProductionTrackList)
        .map(li => html.inside(li))
        .map(label =>
          html.tag('li',
            language.$('trackList.item.previousProduction',
              {track: label}))),

      html.inside(relations.referencedTrackList),
    ]),
};


