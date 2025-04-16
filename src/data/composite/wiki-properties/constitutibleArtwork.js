// This composition does not actually inspect the values of any properties
// specified, so it's not responsible for determining whether a constituted
// artwork should exist at all.

import {input, templateCompositeFrom} from '#composite';
import {withEntries} from '#sugar';
import Thing from '#thing';
import {validateThing} from '#validators';

import {exposeDependency, exposeUpdateValueOrContinue}
  from '#composite/control-flow';
import {withConstitutedArtwork} from '#composite/wiki-data';

const template = templateCompositeFrom({
  annotation: `constitutibleArtwork`,

  compose: false,

  inputs: {
    thingProperty: input({type: 'string', acceptsNull: true}),
    dimensionsFromThingProperty: input({type: 'string', acceptsNull: true}),
    fileExtensionFromThingProperty: input({type: 'string', acceptsNull: true}),
    dateFromThingProperty: input({type: 'string', acceptsNull: true}),
    artistContribsFromThingProperty: input({type: 'string', acceptsNull: true}),
    artistContribsArtistProperty: input({type: 'string', acceptsNull: true}),
    artTagsFromThingProperty: input({type: 'string', acceptsNull: true}),
    referencedArtworksFromThingProperty: input({type: 'string', acceptsNull: true}),
  },

  steps: () => [
    exposeUpdateValueOrContinue({
      validate: input.value(
        validateThing({
          referenceType: 'artwork',
        })),
    }),

    withConstitutedArtwork({
      thingProperty: input('thingProperty'),
      dimensionsFromThingProperty: input('dimensionsFromThingProperty'),
      fileExtensionFromThingProperty: input('fileExtensionFromThingProperty'),
      dateFromThingProperty: input('dateFromThingProperty'),
      artistContribsFromThingProperty: input('artistContribsFromThingProperty'),
      artistContribsArtistProperty: input('artistContribsArtistProperty'),
      artTagsFromThingProperty: input('artTagsFromThingProperty'),
      referencedArtworksFromThingProperty: input('referencedArtworksFromThingProperty'),
    }),

    exposeDependency({
      dependency: '#constitutedArtwork',
    }),
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
