// Strong 'n sturdy contribution list, rolling a list of references (provided
// as this property's update value) and the resolved results (as get exposed)
// into one property. Update value will look something like this:
//
//   [
//     {artist: 'Artist Name', annotation: 'Viola'},
//     {artist: 'artist:john-cena', annotation: null},
//     ...
//   ]
//
// ...typically as processed from YAML, spreadsheet, or elsewhere.
// Exposes as the same, but with the artist property replaced with matches
// found in artistData - which means this always depends on an `artistData`
// property also existing on this object!
//

import {input, templateCompositeFrom} from '#composite';
import {isContributionList, isDate} from '#validators';

import {exposeConstant, exposeDependencyOrContinue} from '#composite/control-flow';
import {withResolvedContribs} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `contributionList`,

  compose: false,

  inputs: {
    date: input({
      validate: isDate,
      acceptsNull: true,
    }),
  },

  update: {validate: isContributionList},

  steps: () => [
    withResolvedContribs({
      from: input.updateValue(),
      thingProperty: input.thisProperty(),
      date: input('date'),
    }),

    exposeDependencyOrContinue({
      dependency: '#resolvedContribs',
    }),

    exposeConstant({
      value: input.value([]),
    }),
  ],
});
