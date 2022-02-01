import CacheableObject from './cacheable-object.js';

import {
    isColor,
    isCountingNumber,
    isName,
    isString,
    oneOf,
    validateArrayItems,
    validateInstanceOf,
    validateReference,
    validateReferenceList,
} from './validators.js';

export class HomepageLayoutRow extends CacheableObject {
    static propertyDescriptors = {
        // Update & expose

        name: {
            flags: {update: true, expose: true},
            update: {validate: isName}
        },

        type: {
            flags: {update: true, expose: true},

            update: {
                validate(value) {
                    throw new Error(`'type' property validator must be overridden`);
                }
            }
        },

        color: {
            flags: {update: true, expose: true},
            update: {validate: isColor}
        },
    };
}

export class HomepageLayoutAlbumsRow extends HomepageLayoutRow {
    static propertyDescriptors = {
        ...HomepageLayoutRow.propertyDescriptors,

        // Update & expose

        type: {
            flags: {update: true, expose: true},
            update: {
                validate(value) {
                    if (value !== 'albums') {
                        throw new TypeError(`Expected 'albums'`);
                    }

                    return true;
                }
            }
        },

        sourceGroupByRef: {
            flags: {update: true, expose: true},
            update: {validate: validateReference('group')}
        },

        sourceAlbumsByRef: {
            flags: {update: true, expose: true},
            update: {validate: validateReferenceList('album')}
        },

        countAlbumsFromGroup: {
            flags: {update: true, expose: true},
            update: {validate: isCountingNumber}
        },

        actionLinks: {
            flags: {update: true, expose: true},
            update: {validate: validateArrayItems(isString)}
        },
    }
}

export default class HomepageLayout extends CacheableObject {
    static propertyDescriptors = {
        // Update & expose

        sidebarContent: {
            flags: {update: true, expose: true},
            update: {validate: isString}
        },

        rows: {
            flags: {update: true, expose: true},

            update: {
                validate: validateArrayItems(validateInstanceOf(HomepageLayoutRow))
            }
        },
    };
}
