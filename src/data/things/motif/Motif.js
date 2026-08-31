import {input, V} from '#composite';
import Thing from '#thing';
import {parseAdditionalNames} from '#yaml';

import {exposeConstant} from '#composite/control-flow';

import {
  color,
  contentString,
  directory,
  name,
  referenceList,
  reverseReferenceList,
  simpleString,
  soupyFind,
  soupyReverse,
  thing,
  thingList,
} from '#composite/wiki-properties';

export class Motif extends Thing {
  static [Thing.referenceType] = 'motif';
  static [Thing.friendlyName] = `Motif`;
  static [Thing.wikiData] = 'motifData';

  static [Thing.getPropertyDescriptors] = ({
    AdditionalName,
    Motif,
    MotifSection,
  }) => ({
    // Update & expose

    motifSection: thing(V(MotifSection)),

    name: name(V('Unnamed Motif')),
    directory: directory(),
    color: color(),

    additionalNames: thingList({
      class: input.value(AdditionalName),
    }),

    abcNotation: simpleString(),

    description: contentString(),

    derivesFromMotifs: referenceList({
      class: input.value(Motif),
      find: soupyFind.input('motif'),
    }),

    // Update only

    find: soupyFind(),
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

    derivedForMotifs: reverseReferenceList({
      reverse: soupyReverse.input('motifsWhichDeriveFrom'),
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

      'ABC Notation': {property: 'abcNotation'},

      'Description': {property: 'description'},

      'Derives From': {property: 'derivesFromMotifs'},
    },
  };

  static [Thing.findSpecs] = {
    motif: {
      referenceTypes: ['motif'],
      bindTo: 'motifData',
    },
  };

  static [Thing.reverseSpecs] = {
    motifsWhichDeriveFrom: {
      bindTo: 'motifData',

      referencing: motif => [motif],
      referenced: motif => motif.derivesFromMotifs,
    },
  };
}
