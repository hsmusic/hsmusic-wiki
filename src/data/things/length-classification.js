export const LENGTH_CLASSIFICATION_DATA_FILE = 'length-classifications.yaml';

import {input} from '#composite';
import Thing from '#thing';
import {isCountingNumber} from '#validators';
import {parseDuration} from '#yaml';

import {
  directory,
  duration,
  name,
  reverseSingleReferenceList,
  wikiData,
} from '#composite/wiki-properties';

export class LengthClassification extends Thing {
  static [Thing.referenceType] = 'length-classification';

  static [Thing.getPropertyDescriptors] = ({Album}) => ({
    // Update & expose

    name: name('Unnamed Length Classification'),
    directory: directory(),

    minimumDuration: duration(),

    minimumTracks: {
      flags: {update: true, expose: true},
      update: {validate: isCountingNumber},
    },

    // Update only

    albumData: wikiData({
      class: input.value(Album),
    }),

    // Expose only

    albums: reverseSingleReferenceList({
      data: 'albumData',
      ref: input.value('lengthClassification'),
    }),
  });

  static [Thing.findSpecs] = {
    lengthClassification: {
      referenceTypes: ['length-classification'],
      bindTo: 'lengthClassificationData',
    },
  };

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Length Classification': {property: 'name'},
      'Directory': {property: 'directory'},

      'Minimum Duration': {
        property: 'minimumDuration',
        transform: parseDuration,
      },

      'Minimum Tracks': {property: 'minimumTracks'},
    },
  };

  static [Thing.getYamlLoadingSpec] = ({
    documentModes: {allInOne},
    thingConstructors: {LengthClassification},
  }) => ({
    title: `Process length classifications file`,
    file: LENGTH_CLASSIFICATION_DATA_FILE,

    documentMode: allInOne,
    documentThing: LengthClassification,

    save: (results) => ({lengthClassificationData: results}),
  });

  // Checks if an album fits the terms of this length classification.
  // Since an album only actually belongs to one length classification,
  // even if it fits multiple claszifications' terms, this doesn't on
  // its own confirm this classification is the album's chosen one.
  locallyIncludes(album) {
    if (this.minimumDuration && album.duration < this.minimumDuration) {
      return false;
    }

    if (this.minimumTracks && album.tracks.length < this.minimumTracks) {
      return false;
    }

    return true;
  }
}
