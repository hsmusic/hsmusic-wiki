import CacheableObject from './cacheable-object.js';
import Thing from './thing.js';

import {
    isColor,
    isDirectory,
    isName,
    isString,
    isURL,
    validateArrayItems,
    validateReferenceList,
} from './validators.js';

export class GroupCategory extends CacheableObject {
    static propertyDescriptors = {
        // Update & expose

        name: {
            flags: {update: true, expose: true},
            update: {default: 'Unnamed Group Category', validate: isName}
        },

        color: {
            flags: {update: true, expose: true},
            update: {validate: isColor}
        },

        groupsByRef: {
            flags: {update: true, expose: true},
            update: {validate: validateReferenceList('group')}
        },
    };
}

export default class Group extends Thing {
    static [Thing.referenceType] = 'group';

    static propertyDescriptors = {
        // Update & expose

        name: {
            flags: {update: true, expose: true},
            update: {default: 'Unnamed Group', validate: isName}
        },

        directory: {
            flags: {update: true, expose: true},
            update: {validate: isDirectory},
            expose: Thing.directoryExpose
        },

        description: {
            flags: {update: true, expose: true},
            update: {validate: isString}
        },

        urls: {
            flags: {update: true, expose: true},
            update: {validate: validateArrayItems(isURL)}
        },

        // Expose only

        descriptionShort: {
            flags: {expose: true},

            expose: {
                dependencies: ['description'],
                compute: ({ description }) => description.split('<hr class="split">')[0]
            }
        }
    };
}
