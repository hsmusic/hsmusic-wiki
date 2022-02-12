// Base class for Things. No, we will not come up with a better name.
// Sorry not sorry! :)

import CacheableObject from './cacheable-object.js';

import {
    validateArrayItems,
} from './validators.js';

import { getKebabCase } from '../util/wiki-data.js';
import find from '../util/find.js';

export default class Thing extends CacheableObject {
    static referenceType = Symbol('Thing.referenceType');

    static directoryExpose = {
        dependencies: ['name'],
        transform(directory, { name }) {
            if (directory === null && name === null)
                return null;
            else if (directory === null)
                return getKebabCase(name);
            else
                return directory;
        }
    };

    static genContribsExpose(contribsByRefProperty) {
        return {
            dependencies: ['artistData', contribsByRefProperty],
            compute: ({ artistData, [contribsByRefProperty]: contribsByRef }) => (
                (contribsByRef && artistData
                    ? (contribsByRef
                        .map(({ who: ref, what }) => ({
                            who: find.artist(ref, {wikiData: {artistData}}),
                            what
                        }))
                        .filter(({ who }) => who))
                    : [])
            )
        };
    }

    static genWikiDataProperty(thingClass) {
        return {
            flags: {update: true},
            update: {
                validate: validateArrayItems(x => x instanceof thingClass)
            }
        };
    }

    static getReference(thing) {
        if (!thing.constructor[Thing.referenceType])
            throw TypeError(`Passed Thing is ${thing.constructor.name}, which provides no [Thing.referenceType]`);

        if (!thing.directory)
            throw TypeError(`Passed ${thing.constructor.name} is missing its directory`);

        return `${thing.constructor[Thing.referenceType]}:${thing.directory}`;
    }
}
