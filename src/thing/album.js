import Thing from './thing.js';

import {
    isBoolean,
    isColor,
    isCommentary,
    isContributionList,
    isDate,
    isDimensions,
    isDirectory,
    isName,
    isURL,
    isString,
    validateArrayItems,
    validateReference,
    validateReferenceList,
} from './validators.js';

import {
    aggregateThrows,
    showAggregate,
    withAggregate
} from '../util/sugar.js';

export default class Album extends Thing {
    /*
    #name = 'Unnamed Album';

    #color = null;
    #directory = null;
    #urls = [];

    #artists = [];
    #coverArtists = [];
    #trackCoverArtists = [];

    #wallpaperArtists = [];
    #wallpaperStyle = '';
    #wallpaperFileExtension = 'jpg';

    #bannerArtists = [];
    #bannerStyle = '';
    #bannerFileExtension = 'jpg';
    #bannerDimensions = [0, 0];

    #date = null;
    #trackArtDate = null;
    #coverArtDate = null;
    #dateAddedToWiki = null;

    #hasTrackArt = true;
    #isMajorRelease = false;
    #isListedOnHomepage = true;

    #aka = '';
    #groups = [];
    #artTags = [];
    #commentary = '';

    #tracks = [];

    static propertyError = {
        name: Thing.extendPropertyError('name'),
        directory: Thing.extendPropertyError('directory'),
        tracks: Thing.extendPropertyError('tracks')
    };
    */

    static propertyDescriptors = {
        // Update & expose

        name: {
            flags: {update: true, expose: true},

            update: {
                default: 'Unnamed Album',
                validate: isName
            }
        },

        color: {
            flags: {update: true, expose: true},
            update: {validate: isColor}
        },

        directory: {
            flags: {update: true, expose: true},
            update: {validate: isDirectory}
        },

        urls: {
            flags: {update: true, expose: true},

            update: {
                validate: validateArrayItems(isURL)
            }
        },

        date: {
            flags: {update: true, expose: true},
            update: {validate: isDate}
        },

        coverArtDate: {
            flags: {update: true, expose: true},
            update: {validate: isDate}
        },

        trackArtDate: {
            flags: {update: true, expose: true},
            update: {validate: isDate}
        },

        dateAddedToWiki: {
            flags: {update: true, expose: true},

            update: {validate: isDate}
        },

        artistContribsByRef: {
            flags: {update: true, expose: true},
            update: {validate: isContributionList}
        },

        coverArtistContribsByRef: {
            flags: {update: true, expose: true},
            update: {validate: isContributionList}
        },

        trackCoverArtistContribsByRef: {
            flags: {update: true, expose: true},
            update: {validate: isContributionList}
        },

        wallpaperArtistContribsByRef: {
            flags: {update: true, expose: true},
            update: {validate: isContributionList}
        },

        bannerArtistContribsByRef: {
            flags: {update: true, expose: true},
            update: {validate: isContributionList}
        },

        groupsByRef: {
            flags: {update: true, expose: true},

            update: {
                validate: validateReferenceList('group')
            }
        },

        artTagsByRef: {
            flags: {update: true, expose: true},

            update: {
                validate: validateReferenceList('tag')
            }
        },

        tracksByRef: {
            flags: {update: true, expose: true},

            update: {
                validate: validateReferenceList('track')
            }
        },

        wallpaperStyle: {
            flags: {update: true, expose: true},
            update: {validate: isString}
        },

        wallpaperFileExtension: {
            flags: {update: true, expose: true},
            update: {validate: isString}
        },

        bannerStyle: {
            flags: {update: true, expose: true},
            update: {validate: isString}
        },

        bannerFileExtension: {
            flags: {update: true, expose: true},
            update: {validate: isString}
        },

        bannerDimensions: {
            flags: {update: true, expose: true},
            update: {validate: isDimensions}
        },

        hasTrackArt: {
            flags: {update: true, expose: true},

            update: {
                default: true,
                validate: isBoolean
            }
        },

        isMajorRelease: {
            flags: {update: true, expose: true},

            update: {
                default: false,
                validate: isBoolean
            }
        },

        isListedOnHomepage: {
            flags: {update: true, expose: true},

            update: {
                default: true,
                validate: isBoolean
            }
        },

        commentary: {
            flags: {update: true, expose: true},
            update: {validate: isCommentary}
        },

        // Expose only

        tracks: {
            flags: {expose: true},

            expose: {
                dependencies: ['trackReferences', 'wikiData'],
                compute: ({trackReferences, wikiData}) => (
                    trackReferences.map(ref => find.track(ref, {wikiData})))
            }
        },

        // Update only

        wikiData: {
            flags: {update: true}
        }
    };

    /*
    update(source) {
        const err = this.constructor.propertyError;

        withAggregate(aggregateThrows(Thing.UpdateError), ({ nest, filter, throws }) => {
            if (source.name) {
                nest(throws(err.name), ({ call }) => {
                    if (call(validateName, source.name)) {
                        this.#name = source.name;
                    }
                });
            }

            if (source.color) {
                nest(throws(err.color), ({ call }) => {
                    if (call(validateColor, source.color)) {
                        this.#color = source.color;
                    }
                });
            }

            if (source.directory) {
                nest(throws(err.directory), ({ call }) => {
                    if (call(validateDirectory, source.directory)) {
                        this.#directory = source.directory;
                    }
                });
            }

            if (source.tracks)
                this.#tracks = filter(source.tracks, validateReference('track'), throws(err.tracks));
        });
    }

    get name() { return this.#name; }
    get directory() { return this.#directory; }
    get tracks() { return this.#tracks; }
    */
}

/*
const album = new Album();

console.log('tracks (before):', album.tracks);

try {
    album.update({
        directory: 'oh yes',
        tracks: [
            'lol',
            123,
            'track:oh-yeah',
            'group:what-am-i-doing-here'
        ]
    });
} catch (error) {
    showAggregate(error);
}

console.log('tracks (after):', album.tracks);
*/
