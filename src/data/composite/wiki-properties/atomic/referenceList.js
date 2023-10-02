// Atomic implementation for referenceList.
//
// Expects these input token shapes:
//  - class: input.value(a constructor)
//  - find: input.value(a function)
//  - data: a string dependency name
//
// Embeds behavior of:
//  - referenceList
//  - withResolvedReferenceList
//

import {getInputTokenValue} from '#composite';
import {empty} from '#sugar';
import {validateReferenceList} from '#validators';

// TODO: Kludge.
import Thing from '../../../things/thing.js';

export default function({
  class: classToken,
  find: findToken,
  data: dataToken,
}) {
  /* ref: referenceList */
  const thingClass = getInputTokenValue(classToken);
  const findFunction = getInputTokenValue(findToken);
  const dataProperty = dataToken;

  /* ref: referenceList */
  const {[Thing.referenceType]: referenceType} = thingClass;

  return {
    flags: {update: true, expose: true, compose: false},

    /* ref: referenceList */
    update: {
      validate: validateReferenceList(referenceType),
    },

    expose: {
      dependencies: [dataProperty],

      transform(referenceList, {[dataProperty]: data}) {
        /* ref: withResolvedReferenceList step #1 (exitWithoutDependency) */
        if (!data) {
          return [];
        }

        /* ref: withResolvedReferenceList step #2 (raiseOutputWithoutDependency) */
        if (referenceList === undefined || empty(referenceList)) {
          return [];
        }

        /* ref: withResolvedReferenceList step #3 (custom) */
        const matches =
          referenceList.map(ref => findFunction(ref, data, {mode: 'quiet'}));

        /* ref: withResolvedReferenceList step #4 (custom)        *
         * ref: withResolvedReferenceList step #5 (custom)        *
         * ref: referenceList step #1 (withResolvedReferenceList) *
         * notFoundMode is 'filter' (default).                    */
        const filteredMatches =
          matches.filter(match => match);

        return filteredMatches;
      },
    },
  };
}
