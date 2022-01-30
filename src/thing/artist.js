import Thing from './thing.js';

import {
    isDirectory,
    isName,
    isString,
    isURL,
    validateArrayItems,
    validateReferenceList,
} from './validators.js';

export default class Artist extends Thing {
    static [Thing.referenceType] = 'artist';

    static propertyDescriptors = {
        // Update & expose

        name: {
            flags: {update: true, expose: true},

            update: {
                default: 'Unnamed Artist',
                validate: isName
            }
        },

        directory: {
            flags: {update: true, expose: true},
            update: {validate: isDirectory},
            expose: Thing.directoryExpose
        },

        urls: {
            flags: {update: true, expose: true},
            update: {validate: validateArrayItems(isURL)}
        },

        aliasRefs: {
            flags: {update: true, expose: true},
            update: {validate: validateReferenceList('artist')}
        },

        contextNotes: {
            flags: {update: true, expose: true},
            update: {validate: isString}
        },
    };
}
