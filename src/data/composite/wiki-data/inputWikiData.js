import {input} from '#composite';
import {validateWikiData} from '#validators';

// TODO: This doesn't access a class's own ThingSubclass[Thing.referenceType]
// value because classes aren't initialized by when templateCompositeFrom gets
// called (see: circular imports). So the reference types have to be hard-coded,
// which somewhat defeats the point of storing them on the class in the first
// place...
export default function inputWikiData({
  referenceType = '',
  allowMixedTypes = false,
} = {}) {
  return input({
    validate: validateWikiData({referenceType, allowMixedTypes}),
    acceptsNull: true,
  });
}
