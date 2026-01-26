import {sortChronologically} from '#sort';

export default ({
  documentModes: {allInOne},
  thingConstructors: {NewsEntry},
}) => ({
  title: `Process news data file`,
  file: 'news.yaml',

  documentMode: allInOne,
  documentThing: NewsEntry,

  sort({newsData}) {
    sortChronologically(newsData, {latestFirst: true});
  },
});
