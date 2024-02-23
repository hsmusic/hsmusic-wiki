import {mapAggregate, withAggregate} from '#aggregate';
import listingSpec, {listingTargetSpec} from '#listing-spec';
import Thing from '#thing';
import thingConstructors from '#things';

const {Listing} = thingConstructors;

export function getTargetFromListingSpec(spec) {
  if (!spec.target) {
    return null;
  }

  return (
    listingTargetSpec
      .find(target => target.target === spec.target));
}

export function getPropertyDescriptorsFromListingSpec(spec) {
  const allDescriptors = {};

  const applyDescriptors = ({name, object}) => {
    if (!object?.[Thing.getPropertyDescriptors]) return;

    const constructorLike = {
      name,

      [Thing.getPropertyDescriptors]:
        object[Thing.getPropertyDescriptors],
    };

    Object.assign(allDescriptors,
      Thing.computePropertyDescriptors(constructorLike, {
        thingConstructors,
      }));
  };

  const listingName =
    `(listing:${spec.directory})`;

  const listingTargetName =
    `(listing-target:${spec.target})`;

  applyDescriptors({
    name: Listing.name,
    object: Listing,
  });

  applyDescriptors({
    name: listingTargetName,
    object: getTargetFromListingSpec(spec),
  });

  applyDescriptors({
    name: listingName,
    object: spec,
  });

  if (spec.data) {
    applyDescriptors({
      name: listingName,
      object: {
        [Thing.getPropertyDescriptors]: opts => ({
          data: spec.data(opts),
        }),
      },
    });
  }

  return allDescriptors;
}

export function constructListingFromSpec(spec) {
  const message = `Errors preparing listing ${spec.directory} (${spec.scope})`;
  return withAggregate({message}, ({call, push}) => {
    const target = getTargetFromListingSpec(spec);
    if (spec.target && !target) {
      push(new Error(`Unknown target "${spec.target}"`));
    }

    const listingClass = class extends Listing {
      static propertyDescriptors =
        getPropertyDescriptorsFromListingSpec(spec);
    };

    Object.defineProperty(listingClass, 'name', {
      value: Listing.name,
    });

    const listing = new listingClass();

    for (const [property, value] of Object.entries(spec)) {
      if (property === 'data') continue;

      call(() => listing[property] = value);
    }

    return listing;
  });
}

export function prepareLiveListingObjects() {
  const {aggregate, result} =
    mapAggregate(listingSpec,
      {message: `Errors preparing live listing objects`},
      spec => constructListingFromSpec(spec));

  aggregate.close();
  return result;
}

export function linkListingDataArrays(wikiData) {
  // This is a very silly function that only exists because we don't currently
  // detect (and react to) the presence of wikiData properties in general.
  // See issue #390.

  if (!wikiData.listingData) return;

  const linkableProperties = [
    'albumData',
    'artTagData',
    'artistData',
    'flashData',
    'groupData',
    'listingData',
    'trackData',
    'wikiData',
  ];

  for (const listing of wikiData.listingData) {
    for (const property of linkableProperties) {
      if (!Object.hasOwn(listing, property)) continue;

      if (property === 'wikiData') {
        listing[property] = wikiData;
      } else {
        listing[property] = wikiData[property];
      }
    }
  }
}
