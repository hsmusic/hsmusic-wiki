import {input, V} from '#composite';
import Thing from '#thing';
import {parseAdditionalNames} from '#yaml';

import {exposeConstant} from '#composite/control-flow';

import {
  color,
  contentString,
  directory,
  name,
  reverseReferenceList,
  soupyReverse,
  thingList,
} from '#composite/wiki-properties';

export class Motif extends Thing {
  static [Thing.referenceType] = 'motif';
  static [Thing.friendlyName] = `Motif`;
  static [Thing.wikiData] = 'motifData';

  static [Thing.getPropertyDescriptors] = ({AdditionalName}) => ({
    // Update & expose

    name: name(V('Unnamed Motif')),
    directory: directory(),
    color: color(),

    additionalNames: thingList({
      class: input.value(AdditionalName),
    }),

    description: contentString(),

    // Update only

    reverse: soupyReverse(),

    // Expose only

    isMotif: [
      exposeConstant({
        value: input.value(true),
      }),
    ],

    featuredInTracks: reverseReferenceList({
      reverse: soupyReverse.input('tracksWhichFeatureMotif'),
    }),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Motif': {property: 'name'},
      'Directory': {property: 'directory'},

      'Additional Names': {
        property: 'additionalNames',
        transform: parseAdditionalNames,
      },

      'Description': {property: 'description'},
    },
  };

  static [Thing.findSpecs] = {
    motif: {
      referenceTypes: ['motif'],
      bindTo: 'motifData',
    },
  };
}
