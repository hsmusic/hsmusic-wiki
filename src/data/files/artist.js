import {sortAlphabetically} from '#sort';

export default ({
  documentModes: {allInOne},
  thingConstructors: {Artist},
}) => ({
  title: `Process artists file`,
  file: 'artists.yaml',

  documentMode: allInOne,
  documentThing: Artist,

  sort({artistData}) {
    sortAlphabetically(artistData);
  },
});
