// Base class for Things. No, we will not come up with a better name.
// Sorry not sorry! :)
//
// NB: Since these methods all involve processing a variety of input data, some
// of which will pass and some of which may fail, any failures should be thrown
// together as an AggregateError. See util/sugar.js for utility functions to
// make writing code around this easier!

export default class Thing {
    constructor(source, {
        wikiData
    } = {}) {
        if (source) {
            this.update(source);
        }

        if (wikiData && this.checkComplete()) {
            this.postprocess({wikiData});
        }
    }

    static PropertyError = class extends AggregateError {
        #key = this.constructor.key;
        get key() { return this.#key; }

        constructor(errors) {
            super(errors, '');
            this.message = `${errors.length} error(s) in property "${this.#key}"`;
        }
    };

    static extendPropertyError(key) {
        const cls = class extends this.PropertyError {
            static #key = key;
            static get key() { return this.#key; }
        };

        Object.defineProperty(cls, 'name', {value: `PropertyError:${key}`});
        return cls;
    }

    // Called when instantiating a thing, and when its data is updated for any
    // reason. (Which currently includes no reasons, but hey, future-proofing!)
    //
    // Don't expect source to be a complete object, even on the first call - the
    // method checkComplete() will prevent incomplete resources from being mixed
    // with the rest.
    update(source) {}

    // Called when collecting the full list of available things of that type
    // for wiki data; this method determine whether or not to include it.
    //
    // This should return whether or not the object is complete enough to be
    // used across the wiki - not whether every optional attribute is provided!
    // (That is, attributes required for postprocessing & basic page generation
    // are all present.)
    checkComplete() {}

    // Called when adding the thing to the wiki data list, and when its source
    // data is updated (provided checkComplete() passes).
    //
    // This should generate any cached object references, across other wiki
    // data; for example, building an array of actual track objects
    // corresponding to an album's track list ('track:cool-track' strings).
    postprocess({wikiData}) {}
}
