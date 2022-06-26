// things-cache.js: Operations which diff data changes and propagate results
// across one global cache for all wiki data
//
// Essential outline: One ThingsCache object has a record of all wiki data
// arrays (albumData, trackData, etc) and adds hooks to property changes on
// new data objects. It provides value changes to a set of pre-configured
// "cache functions" which propagate these observed changes into modifications
// to static data (i.e. the cache) corresponding to all relevant data objects.
//
// Each hook observes a type of Thing and one property. It returns an array of
// modifications (see below). Although all relationships between input objects
// are provided in terms of references (strings ex. "track:showtime-piano-
// refrain"), these are generally observed in terms of actual Thing objects,
// by using a special @<property> format (ex. "@referencedTracks").
//
// - TODO: Is this necessary? We can probably just operate completely agnostic
//   of which data objects actually exist or not, and that's easier if we don't
//   operate on literal wiki data objects - only references, both to the self
//   and to affected objects. References only *need* to be resolved at actual
//   site building (etc) - we can probably hold off anything to do with ref
//   resolving until then.
//
// - TODO: Okay it really doesn't seem necessary - but we DO need to normalize
//   ALL references, FROM THE GET GO, or else we'll run into some pretty bad
//   trouble when it comes to mutating the cache (and then later, somehow,
//   merging two caches that actually corresponded to the same thing...even
//   though we've since discarded the individual changes that built that cache).
//   This isn't actually a major problem - it just necessitates that we take
//   existing someRelationshipByRef data (loaded from YAML) and transform every
//   value into the consistent `thing:directory` format. Which kinda means
//   resolving references from the start again, but whatever, that's a
//   necessary evil in this case (and only needs to be done once per value -
//   obviously we can cache each ref string -> consistent format, and discard
//   that cache after updating the refs because the original YAML-entered refs
//   won't be used anymore during data processing or the main site build).
//
// A modification references one Thing and one property, and represents some
// change to the value stored in that property. For non-array values, it
// indicates overwriting the previous value. For array values, it indicates
// either adding or removing an item. (As far as modifications are concerned,
// arrays do not have order - they are closer to sets than arrays.)
//
// The ThingsCache system isn't necessarily all-encompassing (i.e. in control
// of propagation of all data changes), but it should represent an accurate and
// stateless table of the data and properties it does control. "Stateless" in
// this case means order of operations is irrelevant and the same cache may be
// constructed from scratch given the observed data (no values depend on
// previous values or anything outside the current data set).
//
// Specifics re: "constructing from scratch" - generally the ThingsCache system
// has two goals: to avoid constructing data from scratch where unnecessary and
// to make initial construction (or reconstruction) as efficient as possible.
// Towards the first end, hooks and modifications provide a straightforward way
// to indicate fine-grained data changes as a result of changes to input data.
// For the second goal, each point in input data is only ever operated on once,
// computing all modifications across entire output at once.
//
// "Combination" caches (i.e. one output property whose value depends on two
// input properties) are not yet supported.

import {
    Album,
    Thing,
    Track,
} from './things.js';

import { loadAndProcessDataDocuments } from './yaml.js';
import { logInfo, logError, logWarn, parseOptions } from '../util/cli.js';
import { isMain } from '../util/node-utils.js';
import { showAggregate } from '../util/sugar.js';

import find from '../util/find.js';

const dataThingMap = [
    ['albumData', Album],
    ['trackData', Track],
];

const hooks = [
    [Track, 'referencedTracksByRef', {
        itemAdded(selfRef, referencedTrackRef) {
            return [
                [referencedTrackRef, 'referencedByTracksByRef', {addItem: selfRef}]
            ];
        }
    }],
];

export class ThingsCache {
    #hooks = hooks;

    #supportedWikiDataKeys = dataThingMap.map(([ dataProp, thingClass ]) => dataProp);
    #supportedThingClasses = dataThingMap.map(([ dataProp, thingClass ]) => thingClass);

    #inputWikiData = Object.fromEntries(dataThingMap.map(([ k ]) => [k, []]));
    #outputWikiData = Object.fromEntries(dataThingMap.map(([ k ]) => [k, {}]));

    #trackedModifications = {};

    #hooksByThingClass = hooks.reduce((acc, hook) => {
        const [ thingClass ] = hook;
        if (acc.has(thingClass)) {
            acc.get(thingClass).push(hook);
        } else {
            acc.set(thingClass, [hook]);
        }
        return acc;
    }, new Map(dataThingMap.map(([ k, t ]) => [t, []])));

    loadInitialData(wikiData) {
        const modifications = [];

        for (const [ dataKey, thingData ] of Object.entries(wikiData)) {
            if (Object.hasOwn(this.#inputWikiData, dataKey)) {
                this.#inputWikiData[dataKey] = thingData;
                for (const thing of thingData) {
                    modifications.push(...this.pushThing(thing));
                }
            }
        }

        this.trackModifications(modifications);
        this.applyTrackedModifications();
    }

    pushThing(thing) {
        // Compute modifications from all hooks associated with this Thing's
        // class, treating as though the previous value for each property was
        // null.
        const thingClass = thing.constructor;
        const hooks = this.#hooksByThingClass.get(thingClass);
        return hooks.flatMap(hook => this.computeHookModifications(hook, thing, null));
    }

    computeHookModifications(hook, thing, previousValue) {
        const thingRef = Thing.getReference(thing);

        const a = previousValue;
        const b = this.computeInputPropertyValue(thing, hook[1]);
        const M = hook[2];

        const aIsArray = Array.isArray(a);
        const bIsArray = Array.isArray(b);

        const modifications = [];

        if (bIsArray && !aIsArray) {
            // Value newly an array: Treat all items as new!
            if (M.itemAdded) {
                modifications.push(...b.flatMap(v => M.itemAdded(thingRef, v)));
            }
        } else if (aIsArray && !bIsArray) {
            // Value no longer an array: Treat all items as removed!
            if (M.itemRemoved) {
                modifications.push(...a.flatMap(v => M.itemRemoved(thingRef, v)));
            }
        } else if (aIsArray && bIsArray) {
            // Value remains an array: Diff new and removed items.
            if (M.itemRemoved) {
                modifications.push(...a.filter(v => !b.includes(a)).flatMap(v => M.itemRemoved(thingRef, v)));
            }
            if (M.itemAdded) {
                modifications.push(...b.filter(v => !a.includes(b)).flatMap(v => M.itemAdded(thingRef, v)));
            }
        }

        return modifications;
    }

    computeInputPropertyValue(thing, property) {
        if (property.startsWith('@')) {
            // todo: better mapping than this
            /*
            if (property === '@referencedTracks') {
                return thing.referencedTracksByRef?.map(ref => this.resolveReference('trackData', find.track, ref)) ?? [];
            }
            */
        } else {
            return thing[property];
        }
    }

    trackModifications(modifications) {
        for (const [ ref, prop, change ] of modifications) {
            if (Object.hasOwn(this.#trackedModifications, ref)) {
                const propChanges = this.#trackedModifications[ref];
                if (Object.hasOwn(propChanges, prop)) {
                    propChanges[prop].push(change);
                } else {
                    propChanges[prop] = [change];
                }
            } else {
                this.#trackedModifications[ref] = {[prop]: [change]};
            }
        }
    }

    applyTrackedModifications() {
        for (const [ ref, propChanges ] of Object.entries(this.#trackedModifications)) {
            // todo: compute which thingData array to use
            const thingData = this.#outputWikiData.trackData;
            if (Object.hasOwn(thingData, ref)) {
                // The reference has been recorded...
                const outputProps = thingData[ref];
                for (const [ prop, changes ] of Object.entries(propChanges)) {
                    if (Object.hasOwn(outputProps, prop)) {
                        // ...and so has output data for this property. Apply
                        // the new changes on top, building off the value which
                        // is already present.
                        const value = this.computeValueFromChanges(changes, outputProps[prop]);
                        outputProps[prop] = value;
                    } else {
                        // ...but there's not yet any output data for this
                        // property. Compute a completely new value from the
                        // changes and save it on the existing reference
                        // record.
                        const value = this.computeValueFromChanges(changes, null);
                        outputProps[prop] = value;
                    }
                }
            } else {
                // The reference hasn't yet been recorded - so neither has
                // output data for any properties. Compute completely new
                // values from the changes for each property and save every
                // value together on a new reference record.
                const outputProps = {};
                for (const [ prop, changes ] of Object.entries(propChanges)) {
                    const value = this.computeValueFromChanges(changes, null);
                    thingData[ref] = {[prop]: value};
                }
            }
        }

        console.log(this.#outputWikiData.trackData);
    }

    computeValueFromChanges(changes, previousValue) {
        // todo: non-arrays

        const array = (previousValue
            ? previousValue.slice()
            : []);

        // todo: duplicate / missing item handling? probably that situation
        // should never arise, so maybe unnecessary? if so document that
        for (const change of changes) {
            if (Object.hasOwn(change, 'addItem')) {
                array.push(change.addItem);
            } else if (object.hasOwn(change, 'removeItem')) {
                array.splice(array.indexOf(item), 1);
            }
        }

        return array;
    }

    resolveReference(dataKey, findFn, ref) {
        return findFn(ref, this.#inputWikiData[dataKey], {mode: 'quiet'});
    }
}

if (isMain(import.meta.url)) {
    (async function() {
        const miscOptions = await parseOptions(process.argv.slice(2), {
            'data-path': {
                type: 'value'
            },
        });

        const dataPath = miscOptions['data-path'] || process.env.HSMUSIC_DATA;

        if (!dataPath) {
            logError`Expected --data-path option or HSMUSIC_DATA to be set`;
            return;
        }

        let wikiData;

        {
            const { aggregate, result } = await loadAndProcessDataDocuments({
                dataPath,
            });

            wikiData = result;

            try {
                aggregate.close();
                logInfo`Loaded data without errors. (complete data)`;
            } catch (error) {
                showAggregate(error);
                logWarn`Loaded data with errors. (partial data)`;
            }
        }

        const thingsCache = new ThingsCache();

        console.time();
        thingsCache.loadInitialData(wikiData);
        console.timeEnd();
    })().catch(err => {
        console.error(err);
    });
}
