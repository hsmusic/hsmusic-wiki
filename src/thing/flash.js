import Thing from './thing.js';

import {
    isColor,
    isContributionList,
    isDate,
    isDirectory,
    isFileExtension,
    isName,
    isNumber,
    isString,
    isURL,
    oneOf,
    validateArrayItems,
    validateReferenceList,
} from './validators.js';

export default class Flash extends Thing {
    static [Thing.referenceType] = 'flash';

    static propertyDescriptors = {
        // Update & expose

        name: {
            flags: {update: true, expose: true},

            update: {
                default: 'Unnamed Flash',
                validate: isName
            }
        },

        directory: {
            flags: {update: true, expose: true},
            update: {validate: isDirectory},

            // Flashes expose directory differently from other Things! Their
            // default directory is dependent on the page number (or ID), not
            // the name.
            expose: {
                dependencies: ['page'],
                transform(directory, { page }) {
                    if (directory === null && page === null)
                        return null;
                    else if (directory === null)
                        return page;
                    else
                        return directory;
                }
            }
        },

        page: {
            flags: {update: true, expose: true},
            update: {validate: oneOf(isString, isNumber)},

            expose: {
                transform: value => value.toString()
            }
        },

        date: {
            flags: {update: true, expose: true},
            update: {validate: isDate}
        },

        coverArtFileExtension: {
            flags: {update: true, expose: true},
            update: {validate: isFileExtension}
        },

        featuredTracksByRef: {
            flags: {update: true, expose: true},
            update: {validate: validateReferenceList('track')}
        },

        contributorContribsByRef: {
            flags: {update: true, expose: true},
            update: {validate: isContributionList}
        },

        urls: {
            flags: {update: true, expose: true},
            update: {validate: validateArrayItems(isURL)}
        },
    };
}

export class FlashAct extends Thing {
    static [Thing.referenceType] = 'flash-act';

    static propertyDescriptors = {
        // Update & expose

        name: {
            flags: {update: true, expose: true},

            update: {
                default: 'Unnamed Flash Act',
                validate: isName
            }
        },

        color: {
            flags: {update: true, expose: true},
            update: {validate: isColor}
        },

        anchor: {
            flags: {update: true, expose: true},
            update: {validate: isString}
        },

        jump: {
            flags: {update: true, expose: true},
            update: {validate: isString}
        },

        jumpColor: {
            flags: {update: true, expose: true},
            update: {validate: isColor}
        },

        flashesByRef: {
            flags: {update: true, expose: true},
            update: {validate: validateReferenceList('flash')}
        },
    };
}
