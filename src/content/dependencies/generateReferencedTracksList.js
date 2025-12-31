export default {
  relations: (relation, track) => ({
   trackList:
      relation('generateNearbyTrackList',
        track.referencedTracks,
        track,
        []),
  }),

  generate: (relations, {html}) =>
    html.tag('ul', {[html.onlyIfContent]: true}, [
      // This code is kept here because it's probably the only
      // detailed example of html.inside() lol
      /*
      html.inside(relations.previousProductionTrackList)
        .map(li => html.inside(li))
        .map(label =>
          html.tag('li',
            language.$('trackList.item.previousProduction',
              {track: label}))),
      */

      html.inside(relations.trackList),
    ]),
};
