import {input} from '#composite';
import Thing from '#thing';
import {parseTimeIntoDuration} from '#yaml';

import {simpleString, singleReference, soupyFind, thing, timeIntoDuration}
  from '#composite/wiki-properties';

export class FeaturedMotifConnection extends Thing {
  static [Thing.friendlyName] = `Featured Motif Connection`;
  static [Thing.wikiData] = 'connectionData';

  static [Thing.getPropertyDescriptors] = ({Motif, Track}) => ({
    // Update & expose

    motif: singleReference({
      class: input.value(Motif),
      find: soupyFind.input('motif'),
    }),

    track: thing({
      class: input.value(Track),
    }),

    context: simpleString(),

    startTime: timeIntoDuration(),
    endTime: timeIntoDuration(),

    // Update only

    find: soupyFind(),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Motif': {property: 'motif'},
      'Context': {property: 'context'},

      'Start Time': {
        property: 'startTime',
        transform: parseTimeIntoDuration,
      },

      'End Time': {
        property: 'endTime',
        transform: parseTimeIntoDuration,
      },
    },
  };
}
