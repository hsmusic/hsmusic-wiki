import {mapAggregate, withAggregate} from '#aggregate';
import CacheableObject from '#cacheable-object';
import listingSpec, {listingTargetSpec} from '#listing-spec';
import Thing from '#thing';
import thingConstructors from '#things';

const {Listing} = thingConstructors;

function nameClass(cls, name) {
  Object.defineProperty(cls, 'name', {value: name});
}

export function getTargetFromListingSpec(spec) {
  if (!spec.target) {
    return null;
  }

  return (
    listingTargetSpec
      .find(target => target.target === spec.target));
}

export function createClassFromListingSpec(spec) {
  const listingName =
    `(listing:${spec.directory})`;

  const listingTargetName =
    `(listing-target:${spec.target})`;

  let topOfChain = Listing;

  const target = getTargetFromListingSpec(spec);

  if (target) {
    const listingTargetClass =
      class extends topOfChain {
        static {
          nameClass(this, listingTargetName);
        }

        static [Thing.getPropertyDescriptors](opts) {
          return target[Thing.getPropertyDescriptors]?.(opts) ?? {};
        }
      };

    topOfChain = listingTargetClass;
  }

  const listingClass =
    class extends topOfChain {
      static {
        // Note that this'll get deliberately overwritten soon, though only
        // after we've made the call to Thing.decidePropertyDescriptors.
        nameClass(this, listingName);
      }

      static [Thing.getPropertyDescriptors](opts) {
        const descriptors = {};

        if (spec[Thing.getPropertyDescriptors]) {
          Object.assign(descriptors, spec[Thing.getPropertyDescriptors](opts));
        }

        if (spec.data) {
          descriptors.data = spec.data(opts);
        }

        return descriptors;
      }
    };

  Thing.decidePropertyDescriptors(listingClass, thingConstructors);

  return listingClass;
}

export function constructListingFromSpec(spec) {
  const message = `Errors preparing listing ${spec.directory} (${spec.scope})`;
  return withAggregate({message}, ({call, push}) => {
    const target = getTargetFromListingSpec(spec);
    if (spec.target && !target) {
      push(new Error(`Unknown target "${spec.target}"`));
    }

    const listingClass = createClassFromListingSpec(spec);

    // Rename the listing after the fact. LOL.
    // It's useful to give it a custom name so that compositional properties
    // are easier to identify (they're annotated according to the constructor
    // name at the time). But when actually presenting the Listing instance
    // itself, it should be called Listing.
    nameClass(listingClass, Listing.name);

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
