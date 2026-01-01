import multilingualWordCount from 'word-count';

import {accumulateSum} from '#sugar';

export default {
  relations: (relation, entries) => ({
    bodies:
      entries
        .map(entry => relation('transformContent', entry.body)),
  }),

  data: (entries) => ({
    entries:
      entries.length,
  }),

  generate: (data, relations, {html}) => ({
    entryCount:
      data.entries,

    wordCount:
      accumulateSum(
        relations.bodies.flatMap(body =>
          multilingualWordCount(
            html.resolve(
              body.slot('mode', 'multiline'),
              {normalize: 'plain'})))),
  }),
};