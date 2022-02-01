import Thing from './thing.js';

import {
    isBoolean,
    isColor,
    isDirectory,
    isName,
} from './validators.js';

export default class ArtTag extends Thing {
    static [Thing.referenceType] = 'tag';

    static propertyDescriptors = {
        // Update & expose

        name: {
            flags: {update: true, expose: true},
            update: {validate: isName}
        },

        directory: {
            flags: {update: true, expose: true},
            update: {validate: isDirectory},
            expose: Thing.directoryExpose
        },

        color: {
            flags: {update: true, expose: true},
            update: {validate: isColor}
        },

        isContentWarning: {
            flags: {update: true, expose: true},
            update: {validate: isBoolean, default: false}
        },
    };
}
