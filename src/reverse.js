import * as fr from './find-reverse.js';

function reverseHelper(spec) {
  const cache = new WeakMap();

  return (thing, data) => {
    return ({spec, from: thing, data: data.length});
  };
}

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
  return fr.getAllSpecs(findReverseHelperConfig);
}

export function findReverseSpec(key) {
  return fr.findSpec(key, findReverseHelperConfig);
}

export default fr.tokenProxy({
  findSpec: findReverseSpec,
  prepareBehavior: reverseHelper,
});

export function bindReverse(wikiData, opts) {
  return fr.bind(wikiData, opts, {
    getAllSpecs: getAllReverseSpecs,
    prepareBehavior: reverseHelper,
  });
}
