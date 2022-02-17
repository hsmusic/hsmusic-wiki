// things.js: class definitions for various object types used across the wiki,
// most of which correspond to an output page, such as Track, Album, Artist

import CacheableObject from './cacheable-object.js';

import {
    isBoolean,
    isColor,
    isCommentary,
    isCountingNumber,
    isContributionList,
    isDate,
    isDimensions,
    isDirectory,
    isDuration,
    isInstance,
    isFileExtension,
    isLanguageCode,
    isName,
    isNumber,
    isURL,
    isString,
    oneOf,
    validateArrayItems,
    validateInstanceOf,
    validateReference,
    validateReferenceList,
} from './validators.js';

import {
    getKebabCase,
} from '../util/wiki-data.js';

import find from '../util/find.js';

// Stub classes (and their exports) at the top of the file - these are
// referenced later when we actually define static class fields. We deliberately
// define the classes and set their static fields in two separate steps so that
// every class coexists from the outset, and can be directly referenced in field
// definitions later.

// This list also acts as a quick table of contents for this JS file - use
// ctrl+F or similar to skip to a section.

// -> Thing
export class Thing extends CacheableObject {}

// -> Album
export class Album extends Thing {}
export class TrackGroup extends CacheableObject {}

// -> Track
export class Track extends Thing {}

// -> Artist
export class Artist extends Thing {}

// -> Group
export class Group extends Thing {}
export class GroupCategory extends CacheableObject {}

// -> ArtTag
export class ArtTag extends Thing {}

// -> NewsEntry
export class NewsEntry extends Thing {}

// -> StaticPage
export class StaticPage extends Thing {}

// -> HomepageLayout
export class HomepageLayout extends CacheableObject {}
export class HomepageLayoutRow extends CacheableObject {}
export class HomepageLayoutAlbumsRow extends HomepageLayoutRow {}

// -> Flash
export class Flash extends Thing {}
export class FlashAct extends CacheableObject {}

// -> WikiInfo
export class WikiInfo extends CacheableObject {}

// Before initializing property descriptors, set additional independent
// constants on the classes (which are referenced later).

Thing.referenceType = Symbol('Thing.referenceType');

Album[Thing.referenceType] = 'album';
Track[Thing.referenceType] = 'track';
Artist[Thing.referenceType] = 'artist';
Group[Thing.referenceType] = 'group';
ArtTag[Thing.referenceType] = 'tag';
NewsEntry[Thing.referenceType] = 'news-entry';
StaticPage[Thing.referenceType] = 'static';
Flash[Thing.referenceType] = 'flash';

// -> Thing: base class for wiki data types, providing wiki-specific utility
// functions on top of essential CacheableObject behavior.

// Regularly reused property descriptors, for ease of access and generally
// duplicating less code across wiki data types. These are specialized utility
// functions, so check each for how its own arguments behave!
Thing.common = {
    name: (defaultName) => ({
        flags: {update: true, expose: true},
        update: {validate: isName, default: defaultName}
    }),

    color: () => ({
        flags: {update: true, expose: true},
        update: {validate: isColor}
    }),

    directory: () => ({
        flags: {update: true, expose: true},
        update: {validate: isDirectory},
        expose: {
            dependencies: ['name'],
            transform(directory, { name }) {
                if (directory === null && name === null)
                    return null;
                else if (directory === null)
                    return getKebabCase(name);
                else
                    return directory;
            }
        }
    }),

    urls: () => ({
        flags: {update: true, expose: true},
        update: {validate: validateArrayItems(isURL)}
    }),

    // Straightforward flag descriptor for a variety of property purposes.
    // Provide a default value, true or false!
    flag: (defaultValue = false) => {
        if (typeof defaultValue !== 'boolean') {
            throw new TypeError(`Always set explicit defaults for flags!`);
        }

        return {
            flags: {update: true, expose: true},
            update: {validate: isBoolean, default: defaultValue}
        };
    },

    // General date type, used as the descriptor for a bunch of properties.
    // This isn't dynamic though - it won't inherit from a date stored on
    // another object, for example.
    simpleDate: () => ({
        flags: {update: true, expose: true},
        update: {validate: isDate}
    }),

    // General string type. This should probably generally be avoided in favor
    // of more specific validation, but using it makes it easy to find where we
    // might want to improve later, and it's a useful shorthand meanwhile.
    simpleString: () => ({
        flags: {update: true, expose: true},
        update: {validate: isString}
    }),

    // Super simple "contributions by reference" list, used for a variety of
    // properties (Artists, Cover Artists, etc). This is the property which is
    // externally provided, in the form:
    //
    //     [
    //         {who: 'Artist Name', what: 'Viola'},
    //         {who: 'artist:john-cena', what: null},
    //         ...
    //     ]
    //
    // ...processed from YAML, spreadsheet, or any other kind of input.
    contribsByRef: () => ({
        flags: {update: true, expose: true},
        update: {validate: isContributionList}
    }),

    // A reference list! Keep in mind this is for general references to wiki
    // objects of (usually) other Thing subclasses, not specifically leitmotif
    // references in tracks (although that property uses referenceList too!).
    //
    // The underlying function validateReferenceList expects a string like
    // 'artist' or 'track', but this utility keeps from having to hard-code the
    // string in multiple places by referencing the value saved on the class
    // instead.
    referenceList: thingClass => {
        const { [Thing.referenceType]: referenceType } = thingClass;
        if (!referenceType) {
            throw new Error(`The passed constructor ${thingClass.name} doesn't define Thing.referenceType!`);
        }

        return {
            flags: {update: true, expose: true},
            update: {validate: validateReferenceList(referenceType)}
        };
    },

    // Corresponding function for a single reference.
    singleReference: thingClass => {
        const { [Thing.referenceType]: referenceType } = thingClass;
        if (!referenceType) {
            throw new Error(`The passed constructor ${thingClass.name} doesn't define Thing.referenceType!`);
        }

        return {
            flags: {update: true, expose: true},
            update: {validate: validateReference(referenceType)}
        };
    },

    // Corresponding dynamic property to contribsByRef, which takes the values
    // in the provided property and searches the object's artistData for
    // matching actual Artist objects. The computed structure has the same form
    // as contribsByRef, but with Artist objects instead of string references:
    //
    //     [
    //         {who: (an Artist), what: 'Viola'},
    //         {who: (an Artist), what: null},
    //         ...
    //     ]
    //
    // Contributions whose "who" values don't match anything in artistData are
    // filtered out. (So if the list is all empty, chances are that either the
    // reference list is somehow messed up, or artistData isn't being provided
    // properly.)
    dynamicContribs: (contribsByRefProperty) => ({
        flags: {expose: true},
        expose: {
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
        }
    }),

    // Dynamically inherit a contribution list from some other object, if it
    // hasn't been overridden on this object. This is handy for solo albums
    // where all tracks have the same artist, for example.
    //
    // Note: The arguments of this function aren't currently final! The final
    // format will look more like (contribsByRef, parentContribsByRef), e.g.
    // ('artistContribsByRef', '@album/artistContribsByRef').
    dynamicInheritContribs: (
        contribsByRefProperty,
        parentContribsByRefProperty,
        wikiDataProperty,
        findFn
    ) => ({
        flags: {expose: true},
        expose: {
            dependencies: [contribsByRefProperty, wikiDataProperty, 'artistData'],
            compute({
                [Thing.instance]: thing,
                [contribsByRefProperty]: contribsByRef,
                [wikiDataProperty]: wikiData,
                artistData
            }) {
                if (!artistData) return [];
                const refs = (contribsByRef ?? findFn(thing, wikiData)?.[parentContribsByRefProperty]);
                if (!refs) return [];
                return (refs
                    .map(({ who: ref, what }) => ({
                        who: find.artist(ref, {wikiData: {artistData}}),
                        what
                    }))
                    .filter(({ who }) => who));
            }
        }
    }),

    // General purpose wiki data constructor, for properties like artistData,
    // trackData, etc.
    wikiData: (thingClass) => ({
        flags: {update: true},
        update: {
            validate: validateArrayItems(validateInstanceOf(thingClass))
        }
    })
};

// Get a reference to a thing (e.g. track:showtime-piano-refrain), using its
// constructor's [Thing.referenceType] as the prefix. This will throw an error
// if the thing's directory isn't yet provided/computable.
Thing.getReference = function(thing) {
    if (!thing.constructor[Thing.referenceType])
        throw TypeError(`Passed Thing is ${thing.constructor.name}, which provides no [Thing.referenceType]`);

    if (!thing.directory)
        throw TypeError(`Passed ${thing.constructor.name} is missing its directory`);

    return `${thing.constructor[Thing.referenceType]}:${thing.directory}`;
};

// -> Album

Album.propertyDescriptors = {
    // Update & expose

    name: Thing.common.name('Unnamed Album'),
    color: Thing.common.color(),
    directory: Thing.common.directory(),
    urls: Thing.common.urls(),

    date: Thing.common.simpleDate(),
    coverArtDate: Thing.common.simpleDate(),
    trackArtDate: Thing.common.simpleDate(),
    dateAddedToWiki: Thing.common.simpleDate(),

    artistContribsByRef: Thing.common.contribsByRef(),
    coverArtistContribsByRef: Thing.common.contribsByRef(),
    trackCoverArtistContribsByRef: Thing.common.contribsByRef(),
    wallpaperArtistContribsByRef: Thing.common.contribsByRef(),
    bannerArtistContribsByRef: Thing.common.contribsByRef(),

    groupsByRef: Thing.common.referenceList(Group),
    artTagsByRef: Thing.common.referenceList(ArtTag),

    trackGroups: {
        flags: {update: true, expose: true},

        update: {
            validate: validateArrayItems(validateInstanceOf(TrackGroup))
        }
    },

    wallpaperStyle: Thing.common.simpleString(),

    wallpaperFileExtension: {
        flags: {update: true, expose: true},
        update: {validate: isFileExtension}
    },

    bannerStyle: Thing.common.simpleString(),

    bannerFileExtension: {
        flags: {update: true, expose: true},
        update: {validate: isFileExtension}
    },

    bannerDimensions: {
        flags: {update: true, expose: true},
        update: {validate: isDimensions}
    },

    hasTrackArt: Thing.common.flag(true),
    isMajorRelease: Thing.common.flag(false),
    isListedOnHomepage: Thing.common.flag(true),

    commentary: {
        flags: {update: true, expose: true},
        update: {validate: isCommentary}
    },

    // Update only

    artistData: Thing.common.wikiData(Artist),
    groupData: Thing.common.wikiData(Group),
    trackData: Thing.common.wikiData(Track),

    // Expose only

    // Previously known as: (album).artists
    artistContribs: Thing.common.dynamicContribs('artistContribsByRef'),

    tracks: {
        flags: {expose: true},

        expose: {
            dependencies: ['trackGroups', 'trackData'],
            compute: ({ trackGroups, trackData }) => (
                (trackGroups && trackData
                    ? (trackGroups
                        .flatMap(group => group.tracksByRef ?? [])
                        .map(ref => find.track(ref, {wikiData: {trackData}}))
                        .filter(Boolean))
                    : [])
            )
        }
    },

    groups: {
        flags: {expose: true},

        expose: {
            dependencies: ['groupsByRef', 'groupData'],
            compute: ({ groupsByRef, groupData }) => (
                (groupsByRef && groupData
                    ? (groupsByRef
                        .map(ref => find.group(ref, {wikiData: {groupData}}))
                        .filter(Boolean))
                    : [])
            )
        }
    },
};

TrackGroup.propertyDescriptors = {
    // Update & expose

    name: Thing.common.name('Unnamed Track Group'),
    color: Thing.common.color(),

    dateOriginallyReleased: Thing.common.simpleDate(),

    tracksByRef: Thing.common.referenceList(Track),

    isDefaultTrackGroup: Thing.common.flag(false),

    // Update only

    trackData: Thing.common.wikiData(Track),

    // Expose only

    tracks: {
        flags: {expose: true},

        expose: {
            dependencies: ['tracksByRef', 'trackData'],
            compute: ({ tracksByRef, trackData }) => (
                (tracksByRef && trackData
                    ? (tracksByRef
                        .map(ref => find.track(ref, {wikiData: {trackData}}))
                        .filter(Boolean))
                    : [])
            )
        }
    },
};

// -> Track

// This is a quick utility function for now, since the same code is reused in
// several places. Ideally it wouldn't be - we'd just reuse the `album` property
// - but support for that hasn't been coded yet :P
Track.findAlbum = (track, albumData) => {
    return albumData?.find(album => album.tracks.includes(track));
};

Track.propertyDescriptors = {
    // Update & expose

    name: Thing.common.name('Unnamed Track'),
    directory: Thing.common.directory(),

    duration: {
        flags: {update: true, expose: true},
        update: {validate: isDuration}
    },

    urls: Thing.common.urls(),
    dateFirstReleased: Thing.common.simpleDate(),

    hasCoverArt: Thing.common.flag(true),
    hasURLs: Thing.common.flag(true),

    referencedTracksByRef: Thing.common.referenceList(Track),
    artTagsByRef: Thing.common.referenceList(ArtTag),

    artistContribsByRef: Thing.common.contribsByRef(),
    contributorContribsByRef: Thing.common.contribsByRef(),
    coverArtistContribsByRef: Thing.common.contribsByRef(),

    // Previously known as: (track).aka
    originalReleaseTrackByRef: Thing.common.singleReference(Track),

    commentary: {
        flags: {update: true, expose: true},
        update: {validate: isCommentary}
    },

    lyrics: Thing.common.simpleString(),

    // Update only

    albumData: Thing.common.wikiData(Album),
    artistData: Thing.common.wikiData(Artist),
    artTagData: Thing.common.wikiData(ArtTag),

    // Expose only

    album: {
        flags: {expose: true},

        expose: {
            dependencies: ['albumData'],
            compute: ({ [Track.instance]: track, albumData }) => (
                albumData?.find(album => album.tracks.includes(track)) ?? null)
        }
    },

    date: {
        flags: {expose: true},

        expose: {
            dependencies: ['albumData', 'dateFirstReleased'],
            compute: ({ albumData, dateFirstReleased, [Track.instance]: track }) => (
                dateFirstReleased ??
                Track.findAlbum(track)?.date ??
                null
            )
        }
    },

    coverArtDate: {
        flags: {update: true, expose: true},

        update: {validate: isDate},

        expose: {
            dependencies: ['albumData', 'dateFirstReleased'],
            transform: (coverArtDate, { albumData, dateFirstReleased, [Track.instance]: track }) => (
                coverArtDate ??
                dateFirstReleased ??
                Track.findAlbum(track, albumData)?.trackArtDate ??
                Track.findAlbum(track, albumData)?.date ??
                null
            )
        }
    },

    // Previously known as: (track).artists
    artistContribs: Thing.common.dynamicInheritContribs('artistContribsByRef', 'artistContribsByRef', 'albumData', Track.findAlbum),

    // Previously known as: (track).contributors
    contributorContribs: Thing.common.dynamicContribs('contributorContribsByRef'),

    // Previously known as: (track).coverArtists
    coverArtistContribs: Thing.common.dynamicInheritContribs('coverArtistContribsByRef', 'trackCoverArtistContribsByRef', 'albumData', Track.findAlbum),

    artTags: {
        flags: {expose: true},

        expose: {
            dependencies: ['artTagsByRef', 'artTagData'],

            compute: ({ artTagsByRef, artTagData }) => (
                (artTagsByRef && artTagData
                    ? (artTagsByRef
                        .map(ref => find.tag(ref, {wikiData: {tagData: artTagData}}))
                        .filter(Boolean))
                    : [])
            )
        }
    }
};

// -> Artist

Artist.propertyDescriptors = {
    // Update & expose

    name: Thing.common.name('Unnamed Artist'),
    directory: Thing.common.directory(),
    urls: Thing.common.urls(),
    contextNotes: Thing.common.simpleString(),

    aliasNames: {
        flags: {update: true, expose: true},
        update: {
            validate: validateArrayItems(isName)
        }
    },
};

// -> Group

Group.propertyDescriptors = {
    // Update & expose

    name: Thing.common.name('Unnamed Group'),
    directory: Thing.common.directory(),

    description: Thing.common.simpleString(),

    urls: Thing.common.urls(),

    // Expose only

    descriptionShort: {
        flags: {expose: true},

        expose: {
            dependencies: ['description'],
            compute: ({ description }) => description.split('<hr class="split">')[0]
        }
    }
};

GroupCategory.propertyDescriptors = {
    // Update & expose

    name: Thing.common.name('Unnamed Group Category'),
    color: Thing.common.color(),

    groupsByRef: Thing.common.referenceList(Group),
};

// -> ArtTag

ArtTag.propertyDescriptors = {
    // Update & expose

    name: Thing.common.name('Unnamed Art Tag'),
    directory: Thing.common.directory(),
    color: Thing.common.color(),
    isContentWarning: Thing.common.flag(false),
};

// -> NewsEntry

NewsEntry.propertyDescriptors = {
    // Update & expose

    name: Thing.common.name('Unnamed News Entry'),
    directory: Thing.common.directory(),
    date: Thing.common.simpleDate(),

    content: Thing.common.simpleString(),

    // Expose only

    contentShort: {
        flags: {expose: true},

        expose: {
            dependencies: ['content'],

            compute({ content }) {
                return body.split('<hr class="split">')[0];
            }
        }
    },
};

// -> StaticPage

StaticPage.propertyDescriptors = {
    // Update & expose

    name: Thing.common.name('Unnamed Static Page'),

    nameShort: {
        flags: {update: true, expose: true},
        update: {validate: isName},

        expose: {
            dependencies: ['name'],
            transform: (value, { name }) => value ?? name
        }
    },

    directory: Thing.common.directory(),
    content: Thing.common.simpleString(),
    stylesheet: Thing.common.simpleString(),
    showInNavigationBar: Thing.common.flag(true),
};

// -> HomepageLayout

HomepageLayout.propertyDescriptors = {
    // Update & expose

    sidebarContent: Thing.common.simpleString(),

    rows: {
        flags: {update: true, expose: true},

        update: {
            validate: validateArrayItems(validateInstanceOf(HomepageLayoutRow))
        }
    },
};

HomepageLayoutRow.propertyDescriptors = {
    // Update & expose

    name: Thing.common.name('Unnamed Homepage Row'),

    type: {
        flags: {update: true, expose: true},

        update: {
            validate(value) {
                throw new Error(`'type' property validator must be overridden`);
            }
        }
    },

    color: Thing.common.color(),
};

HomepageLayoutAlbumsRow.propertyDescriptors = {
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

    sourceGroupByRef: Thing.common.singleReference(Group),
    sourceAlbumsByRef: Thing.common.referenceList(Album),

    countAlbumsFromGroup: {
        flags: {update: true, expose: true},
        update: {validate: isCountingNumber}
    },

    actionLinks: {
        flags: {update: true, expose: true},
        update: {validate: validateArrayItems(isString)}
    },
};

// -> Flash

Flash.propertyDescriptors = {
    // Update & expose

    name: Thing.common.name('Unnamed Flash'),

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

    date: Thing.common.simpleDate(),

    coverArtFileExtension: {
        flags: {update: true, expose: true},
        update: {validate: isFileExtension}
    },

    featuredTracksByRef: Thing.common.referenceList(Track),

    contributorContribsByRef: Thing.common.contribsByRef(),

    urls: Thing.common.urls(),
};

FlashAct.propertyDescriptors = {
    // Update & expose

    name: Thing.common.name('Unnamed Flash Act'),
    color: Thing.common.color(),
    anchor: Thing.common.simpleString(),
    jump: Thing.common.simpleString(),
    jumpColor: Thing.common.color(),

    flashesByRef: Thing.common.referenceList(Flash),
};

// WikiInfo

WikiInfo.propertyDescriptors = {
    // Update & expose

    name: Thing.common.name('Unnamed Wiki'),

    // Displayed in nav bar.
    shortName: {
        flags: {update: true, expose: true},
        update: {validate: isName},

        expose: {
            dependencies: ['name'],
            transform: (value, { name }) => value ?? name
        }
    },

    color: Thing.common.color(),

    // One-line description used for <meta rel="description"> tag.
    description: Thing.common.simpleString(),

    footerContent: Thing.common.simpleString(),

    defaultLanguage: {
        flags: {update: true, expose: true},
        update: {validate: isLanguageCode}
    },

    canonicalBase: {
        flags: {update: true, expose: true},
        update: {validate: isURL}
    },

    // Feature toggles

    enableArtistAvatars: Thing.common.flag(false),
    enableFlashesAndGames: Thing.common.flag(false),
    enableListings: Thing.common.flag(false),
    enableNews: Thing.common.flag(false),
    enableArtTagUI: Thing.common.flag(false),
    enableGroupUI: Thing.common.flag(false),
};
