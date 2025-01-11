import {findSpec, getAllSpecs, tokenProxy} from './find-reverse.js';

const hardcodedReverseSpecs = {};

const findReverseHelperConfig = {
  word: `reverse`,
  constructorKey: Symbol.for('Thing.reverseSpecs'),

  hardcodedSpecs: hardcodedReverseSpecs,
  postprocessSpec: postprocessReverseSpec,
};

export function postprocessReverseSpec(spec, {thingConstructor}) {
  const newSpec = {...spec};

  void thingConstructor;

  return newSpec;
}

export function getAllReverseSpecs() {
  return getAllSpecs(findReverseHelperConfig);
}

export function findReverseSpec(key) {
  return findSpec(key, findReverseHelperConfig);
}

export default tokenProxy({
  findSpec: findReverseSpec,
  prepareBehavior: spec => from => ({spec, from}),
});
