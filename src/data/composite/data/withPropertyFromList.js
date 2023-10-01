// Gets a property from each of a list of objects (in a dependency) and
// provides the results.
//
// This doesn't alter any list indices, so positions which were null in the
// original list are kept null here. Objects which don't have the specified
// property are retained in-place as null.
//
// See also:
//  - withPropertiesFromList
//  - withPropertyFromObject
//
// More list utilities:
//  - excludeFromList
//  - fillMissingListItems
//  - withFlattenedList
//  - withUnflattenedList
//

import {empty} from '#sugar';

// todo: OUHHH THIS ONE'S NOT UPDATED YET LOL
export default function({
  list,
  property,
  into = null,
}) {
  into ??=
    (list.startsWith('#')
      ? `${list}.${property}`
      : `#${list}.${property}`);

  return {
    annotation: `withPropertyFromList`,
    flags: {expose: true, compose: true},

    expose: {
      mapDependencies: {list},
      mapContinuation: {into},
      options: {property},

      compute(continuation, {list, '#options': {property}}) {
        if (list === undefined || empty(list)) {
          return continuation({into: []});
        }

        return continuation({
          into:
            list.map(item =>
              (item === null || item === undefined
                ? null
                : item[property] ?? null)),
        });
      },
    },
  };
}
