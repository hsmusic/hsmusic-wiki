// This composition does not actually inspect the values of any properties
// specified, so it's not responsible for determining whether a constituted
// artwork should exist at all.

import {input, templateCompositeFrom} from '#composite';
import {withEntries} from '#sugar';
import Thing from '#thing';
import {validateWikiData} from '#validators';

import {exposeUpdateValueOrContinue} from '#composite/control-flow';
import {withConstitutedArtwork} from '#composite/wiki-data';

const template = templateCompositeFrom({
  annotation: `constitutibleArtwork`,

  compose: false,

  inputs: {
    fileExtensionFromThingProperty: input({type: 'string'}),
    artistContribsFromThingProperty: input({type: 'string'}),
    artistContribsArtistProperty: input({type: 'string'}),
    dateFromThingProperty: input({type: 'string'}),
  },

  steps: () => [
    exposeUpdateValueOrContinue({
      validate: input.value(
        validateWikiData({
          referenceType: 'artwork',
        })),
    }),

    withConstitutedArtwork({
      fileExtensionFromThingProperty: input('fileExtensionFromThingProperty'),
      artistContribsFromThingProperty: input('artistContribsFromThingProperty'),
      artistContribsArtistProperty: input('artistContribsArtistProperty'),
      dateFromThingProperty: input('dateFromThingProperty'),
    }),

    {
      dependencies: ['#constitutedArtwork'],
      compute: ({
        ['#constitutedArtwork']: constitutedArtwork,
      }) => [constitutedArtwork],
    },
  ],
});

template.fromYAMLFieldSpec = function(field) {
  const {[Thing.yamlDocumentSpec]: documentSpec} = this;

  const {provide} = documentSpec.fields[field].transform;

  const inputs =
    withEntries(provide, entries =>
      entries.map(([property, value]) => [
        property,
        input.value(value),
      ]));

  return template(inputs);
};

export default template;
