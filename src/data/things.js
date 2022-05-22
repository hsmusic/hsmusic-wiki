// things.js: class definitions for various object types used across the wiki,
// most of which correspond to an output page, such as Track, Album, Artist

import CacheableObject from './cacheable-object.js';

import {
    isAdditionalFileList,
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
    isWholeNumber,
    oneOf,
    validateArrayItems,
    validateInstanceOf,
    validateReference,
    validateReferenceList,
} from './validators.js';

import * as S from './serialize.js';

import {
    getKebabCase,
    sortByArtDate,
} from '../util/wiki-data.js';

import find from '../util/find.js';

import { inspect } from 'util';
import { color } from '../util/cli.js';

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

// -> Language
export class Language extends CacheableObject {}

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

    // A file extension! Or the default, if provided when calling this.
    fileExtension: (defaultFileExtension = null) => ({
        flags: {update: true, expose: true},
        update: {validate: isFileExtension},
        expose: {transform: value => value ?? defaultFileExtension}
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

    // External function. These should only be used as dependencies for other
    // properties, so they're left unexposed.
    externalFunction: () => ({
        flags: {update: true},
        update: {validate: t => typeof t === 'function'}
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

    // Artist commentary! Generally present on tracks and albums.
    commentary: () => ({
        flags: {update: true, expose: true},
        update: {validate: isCommentary}
    }),

    // This is a somewhat more involved data structure - it's for additional
    // or "bonus" files associated with albums or tracks (or anything else).
    // It's got this form:
    //
    //     [
    //         {title: 'Booklet', files: ['Booklet.pdf']},
    //         {
    //             title: 'Wallpaper',
    //             description: 'Cool Wallpaper!',
    //             files: ['1440x900.png', '1920x1080.png']
    //         },
    //         {title: 'Alternate Covers', description: null, files: [...]},
    //         ...
    //     ]
    //
    additionalFiles: () => ({
        flags: {update: true, expose: true},
        update: {validate: isAdditionalFileList}
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

    // Corresponding dynamic property to referenceList, which takes the values
    // in the provided property and searches the specified wiki data for
    // matching actual Thing-subclass objects.
    dynamicThingsFromReferenceList: (
        referenceListProperty,
        thingDataProperty,
        findFn
    ) => ({
        flags: {expose: true},

        expose: {
            dependencies: [referenceListProperty, thingDataProperty],
            compute: ({ [referenceListProperty]: refs, [thingDataProperty]: thingData }) => (
                (refs && thingData
                    ? (refs
                        .map(ref => findFn(ref, thingData, {mode: 'quiet'}))
                        .filter(Boolean))
                    : [])
            )
        }
    }),

    // Corresponding function for a single reference.
    dynamicThingFromSingleReference: (
        singleReferenceProperty,
        thingDataProperty,
        findFn
    ) => ({
        flags: {expose: true},

        expose: {
            dependencies: [singleReferenceProperty, thingDataProperty],
            compute: ({ [singleReferenceProperty]: ref, [thingDataProperty]: thingData }) => (
                (ref && thingData ? findFn(ref, thingData, {mode: 'quiet'}) : [])
            )
        }
    }),

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
                ((contribsByRef && artistData)
                    ? (contribsByRef
                        .map(({ who: ref, what }) => ({
                            who: find.artist(ref, artistData),
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
        thingDataProperty,
        findFn
    ) => ({
        flags: {expose: true},
        expose: {
            dependencies: [contribsByRefProperty, thingDataProperty, 'artistData'],
            compute({
                [Thing.instance]: thing,
                [contribsByRefProperty]: contribsByRef,
                [thingDataProperty]: thingData,
                artistData
            }) {
                if (!artistData) return [];
                const refs = (contribsByRef ?? findFn(thing, thingData, {mode: 'quiet'})?.[parentContribsByRefProperty]);
                if (!refs) return [];
                return (refs
                    .map(({ who: ref, what }) => ({
                        who: find.artist(ref, artistData),
                        what
                    }))
                    .filter(({ who }) => who));
            }
        }
    }),

    // Neat little shortcut for "reversing" the reference lists stored on other
    // things - for example, tracks specify a "referenced tracks" property, and
    // you would use this to compute a corresponding "referenced *by* tracks"
    // property. Naturally, the passed ref list property is of the things in the
    // wiki data provided, not the requesting Thing itself.
    reverseReferenceList: (wikiDataProperty, referencerRefListProperty) => ({
        flags: {expose: true},

        expose: {
            dependencies: [wikiDataProperty],

            compute: ({ [wikiDataProperty]: wikiData, [Thing.instance]: thing }) => (
                (wikiData
                    ? wikiData.filter(t => t[referencerRefListProperty]?.includes(thing))
                    : [])
            )
        }
    }),

    // Corresponding function for single references. Note that the return value
    // is still a list - this is for matching all the objects whose single
    // reference (in the given property) matches this Thing.
    reverseSingleReference: (wikiDataProperty, referencerRefListProperty) => ({
        flags: {expose: true},

        expose: {
            dependencies: [wikiDataProperty],

            compute: ({ [wikiDataProperty]: wikiData, [Thing.instance]: thing }) => (
                wikiData?.filter(t => t[referencerRefListProperty] === thing))
        }
    }),

    // General purpose wiki data constructor, for properties like artistData,
    // trackData, etc.
    wikiData: (thingClass) => ({
        flags: {update: true},
        update: {
            validate: validateArrayItems(validateInstanceOf(thingClass))
        }
    }),

    // This one's kinda tricky: it parses artist "references" from the
    // commentary content, and finds the matching artist for each reference.
    // This is mostly useful for credits and listings on artist pages.
    commentatorArtists: () => ({
        flags: {expose: true},

        expose: {
            dependencies: ['artistData', 'commentary'],

            compute: ({ artistData, commentary }) => (
                (artistData && commentary
                    ? Array.from(new Set((Array
                        .from(commentary
                            .replace(/<\/?b>/g, '')
                            .matchAll(/<i>(?<who>.*?):<\/i>/g))
                        .map(({ groups: {who} }) => find.artist(who, artistData, {mode: 'quiet'})))))
                    : []))
        }
    }),
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

// Default custom inspect function, which may be overridden by Thing subclasses.
// This will be used when displaying aggregate errors and other in command-line
// logging - it's the place to provide information useful in identifying the
// Thing being presented.
Thing.prototype[inspect.custom] = function() {
    const cname = this.constructor.name;

    return (this.name
        ? `${cname} ${color.green(`"${this.name}"`)}`
        : `${cname}`) + (this.directory
            ? ` (${color.blue(Thing.getReference(this))})`
            : '');
};

// -> Album

Album.propertyDescriptors = {
    // Update & expose

    name: Thing.common.name('Unnamed Album'),
    color: Thing.common.color(),
    directory: Thing.common.directory(),
    urls: Thing.common.urls(),

    date: Thing.common.simpleDate(),
    trackArtDate: Thing.common.simpleDate(),
    dateAddedToWiki: Thing.common.simpleDate(),

    coverArtDate: {
        flags: {update: true, expose: true},

        update: {validate: isDate},

        expose: {
            dependencies: ['date'],
            transform: (coverArtDate, { date }) => coverArtDate ?? date ?? null
        }
    },

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

    coverArtFileExtension: Thing.common.fileExtension('jpg'),
    trackCoverArtFileExtension: Thing.common.fileExtension('jpg'),

    wallpaperStyle: Thing.common.simpleString(),
    wallpaperFileExtension: Thing.common.fileExtension('jpg'),

    bannerStyle: Thing.common.simpleString(),
    bannerFileExtension: Thing.common.fileExtension('jpg'),
    bannerDimensions: {
        flags: {update: true, expose: true},
        update: {validate: isDimensions}
    },

    hasCoverArt: Thing.common.flag(true),
    hasTrackArt: Thing.common.flag(true),
    hasTrackNumbers: Thing.common.flag(true),
    isMajorRelease: Thing.common.flag(false),
    isListedOnHomepage: Thing.common.flag(true),

    commentary: Thing.common.commentary(),
    additionalFiles: Thing.common.additionalFiles(),

    // Update only

    artistData: Thing.common.wikiData(Artist),
    artTagData: Thing.common.wikiData(ArtTag),
    groupData: Thing.common.wikiData(Group),
    trackData: Thing.common.wikiData(Track),

    // Expose only

    artistContribs: Thing.common.dynamicContribs('artistContribsByRef'),
    coverArtistContribs: Thing.common.dynamicContribs('coverArtistContribsByRef'),
    trackCoverArtistContribs: Thing.common.dynamicContribs('trackCoverArtistContribsByRef'),
    wallpaperArtistContribs: Thing.common.dynamicContribs('wallpaperArtistContribsByRef'),
    bannerArtistContribs: Thing.common.dynamicContribs('bannerArtistContribsByRef'),

    commentatorArtists: Thing.common.commentatorArtists(),

    tracks: {
        flags: {expose: true},

        expose: {
            dependencies: ['trackGroups', 'trackData'],
            compute: ({ trackGroups, trackData }) => (
                (trackGroups && trackData
                    ? (trackGroups
                        .flatMap(group => group.tracksByRef ?? [])
                        .map(ref => find.track(ref, trackData, {mode: 'quiet'}))
                        .filter(Boolean))
                    : [])
            )
        }
    },

    groups: Thing.common.dynamicThingsFromReferenceList('groupsByRef', 'groupData', find.group),

    artTags: Thing.common.dynamicThingsFromReferenceList('artTagsByRef', 'artTagData', find.artTag),
};

Album[S.serializeDescriptors] = {
    name: S.id,
    color: S.id,
    directory: S.id,
    urls: S.id,

    date: S.id,
    coverArtDate: S.id,
    trackArtDate: S.id,
    dateAddedToWiki: S.id,

    artistContribs: S.toContribRefs,
    coverArtistContribs: S.toContribRefs,
    trackCoverArtistContribs: S.toContribRefs,
    wallpaperArtistContribs: S.toContribRefs,
    bannerArtistContribs: S.toContribRefs,

    coverArtFileExtension: S.id,
    trackCoverArtFileExtension: S.id,
    wallpaperStyle: S.id,
    wallpaperFileExtension: S.id,
    bannerStyle: S.id,
    bannerFileExtension: S.id,
    bannerDimensions: S.id,

    hasTrackArt: S.id,
    isMajorRelease: S.id,
    isListedOnHomepage: S.id,

    commentary: S.id,
    additionalFiles: S.id,

    tracks: S.toRefs,
    groups: S.toRefs,
    artTags: S.toRefs,
    commentatorArtists: S.toRefs,
};

TrackGroup.propertyDescriptors = {
    // Update & expose

    name: Thing.common.name('Unnamed Track Group'),

    color: {
        flags: {update: true, expose: true},

        update: {validate: isColor},

        expose: {
            dependencies: ['album'],

            transform(color, { album }) {
                return color ?? album?.color ?? null;
            }
        }
    },

    dateOriginallyReleased: Thing.common.simpleDate(),

    tracksByRef: Thing.common.referenceList(Track),

    isDefaultTrackGroup: Thing.common.flag(false),

    // Update only

    album: {
        flags: {update: true},
        update: {validate: validateInstanceOf(Album)}
    },

    trackData: Thing.common.wikiData(Track),

    // Expose only

    tracks: {
        flags: {expose: true},

        expose: {
            dependencies: ['tracksByRef', 'trackData'],
            compute: ({ tracksByRef, trackData }) => (
                (tracksByRef && trackData
                    ? (tracksByRef
                        .map(ref => find.track(ref, trackData))
                        .filter(Boolean))
                    : [])
            )
        }
    },

    startIndex: {
        flags: {expose: true},

        expose: {
            dependencies: ['album'],
            compute: ({ album, [TrackGroup.instance]: trackGroup }) => (album.trackGroups
                .slice(0, album.trackGroups.indexOf(trackGroup))
                .reduce((acc, tg) => acc + tg.tracks.length, 0))
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

// Another reused utility function. This one's logic is a bit more complicated.
Track.hasCoverArt = (track, albumData, coverArtistContribsByRef, hasCoverArt) => {
    return (
        hasCoverArt ??
        (coverArtistContribsByRef?.length > 0 || null) ??
        Track.findAlbum(track, albumData)?.hasTrackArt ??
        true);
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

    hasURLs: Thing.common.flag(true),

    artistContribsByRef: Thing.common.contribsByRef(),
    contributorContribsByRef: Thing.common.contribsByRef(),
    coverArtistContribsByRef: Thing.common.contribsByRef(),

    referencedTracksByRef: Thing.common.referenceList(Track),
    artTagsByRef: Thing.common.referenceList(ArtTag),

    hasCoverArt: {
        flags: {update: true, expose: true},

        update: {validate: isBoolean},

        expose: {
            dependencies: ['albumData', 'coverArtistContribsByRef'],
            transform: (hasCoverArt, { albumData, coverArtistContribsByRef, [Track.instance]: track }) => (
                Track.hasCoverArt(track, albumData, coverArtistContribsByRef, hasCoverArt))
        }
    },

    coverArtFileExtension: {
        flags: {update: true, expose: true},

        update: {validate: isFileExtension},

        expose: {
            dependencies: ['albumData', 'coverArtistContribsByRef'],
            transform: (coverArtFileExtension, { albumData, coverArtistContribsByRef, hasCoverArt, [Track.instance]: track }) => (
                coverArtFileExtension ??
                (Track.hasCoverArt(track, albumData, coverArtistContribsByRef, hasCoverArt)
                    ? Track.findAlbum(track, albumData)?.trackCoverArtFileExtension
                    : Track.findAlbum(track, albumData)?.coverArtFileExtension) ??
                'jpg')
        }
    },

    // Previously known as: (track).aka
    originalReleaseTrackByRef: Thing.common.singleReference(Track),

    dataSourceAlbumByRef: Thing.common.singleReference(Album),

    commentary: Thing.common.commentary(),
    lyrics: Thing.common.simpleString(),
    additionalFiles: Thing.common.additionalFiles(),

    // Update only

    albumData: Thing.common.wikiData(Album),
    artistData: Thing.common.wikiData(Artist),
    artTagData: Thing.common.wikiData(ArtTag),
    flashData: Thing.common.wikiData(Flash),
    trackData: Thing.common.wikiData(Track),

    // Expose only

    commentatorArtists: Thing.common.commentatorArtists(),

    album: {
        flags: {expose: true},

        expose: {
            dependencies: ['albumData'],
            compute: ({ [Track.instance]: track, albumData }) => (
                albumData?.find(album => album.tracks.includes(track)) ?? null)
        }
    },

    // Note - this is an internal property used only to help identify a track.
    // It should not be assumed in general that the album and dataSourceAlbum match
    // (i.e. a track may dynamically be moved from one album to another, at
    // which point dataSourceAlbum refers to where it was originally from, and is
    // not generally relevant information). It's also not guaranteed that
    // dataSourceAlbum is available (depending on the Track creator to optionally
    // provide dataSourceAlbumByRef).
    dataSourceAlbum: Thing.common.dynamicThingFromSingleReference('dataSourceAlbumByRef', 'albumData', find.album),

    date: {
        flags: {expose: true},

        expose: {
            dependencies: ['albumData', 'dateFirstReleased'],
            compute: ({ albumData, dateFirstReleased, [Track.instance]: track }) => (
                dateFirstReleased ??
                Track.findAlbum(track, albumData)?.date ??
                null
            )
        }
    },

    color: {
        flags: {expose: true},

        expose: {
            dependencies: ['albumData'],

            compute: ({ albumData, [Track.instance]: track }) => (
                (Track.findAlbum(track, albumData)?.trackGroups
                    .find(tg => tg.tracks.includes(track))?.color)
                ?? null
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

    originalReleaseTrack: Thing.common.dynamicThingFromSingleReference('originalReleaseTrackByRef', 'trackData', find.track),

    otherReleases: {
        flags: {expose: true},

        expose: {
            dependencies: ['originalReleaseTrackByRef', 'trackData'],

            compute: ({ originalReleaseTrackByRef: t1origRef, trackData, [Track.instance]: t1 }) => {
                if (!trackData) {
                    return [];
                }

                const t1orig = find.track(t1origRef, trackData);

                return [
                    t1orig,
                    ...trackData.filter(t2 => {
                        const { originalReleaseTrack: t2orig } = t2;
                        return (
                            t2 !== t1 &&
                            t2orig &&
                            (t2orig === t1orig || t2orig === t1)
                        );
                    })
                ].filter(Boolean);
            }
        }
    },

    // Previously known as: (track).artists
    artistContribs: Thing.common.dynamicInheritContribs('artistContribsByRef', 'artistContribsByRef', 'albumData', Track.findAlbum),

    // Previously known as: (track).contributors
    contributorContribs: Thing.common.dynamicContribs('contributorContribsByRef'),

    // Previously known as: (track).coverArtists
    coverArtistContribs: Thing.common.dynamicInheritContribs('coverArtistContribsByRef', 'trackCoverArtistContribsByRef', 'albumData', Track.findAlbum),

    // Previously known as: (track).references
    referencedTracks: Thing.common.dynamicThingsFromReferenceList('referencedTracksByRef', 'trackData', find.track),

    // Previously known as: (track).referencedBy
    referencedByTracks: Thing.common.reverseReferenceList('trackData', 'referencedTracks'),

    // Previously known as: (track).flashes
    featuredInFlashes: Thing.common.reverseReferenceList('flashData', 'featuredTracks'),

    artTags: Thing.common.dynamicThingsFromReferenceList('artTagsByRef', 'artTagData', find.artTag),
};

Track.prototype[inspect.custom] = function() {
    const base = Thing.prototype[inspect.custom].apply(this);

    const { album, dataSourceAlbum } = this;
    const albumName = (album ? album.name : dataSourceAlbum?.name);
    const albumIndex = albumName && (album ? album.tracks.indexOf(this) : dataSourceAlbum.tracks.indexOf(this));
    const trackNum = (albumIndex === -1 ? '#?' : `#${albumIndex + 1}`);

    return (albumName
        ? base + ` (${color.yellow(trackNum)} in ${color.green(albumName)})`
        : base);
};

// -> Artist

Artist.filterByContrib = (thingDataProperty, contribsProperty) => ({
    flags: {expose: true},

    expose: {
        dependencies: [thingDataProperty],

        compute: ({ [thingDataProperty]: thingData, [Artist.instance]: artist }) => (
            thingData?.filter(({ [contribsProperty]: contribs }) => (
                contribs?.some(contrib => contrib.who === artist))))
    }
});

Artist.propertyDescriptors = {
    // Update & expose

    name: Thing.common.name('Unnamed Artist'),
    directory: Thing.common.directory(),
    urls: Thing.common.urls(),
    contextNotes: Thing.common.simpleString(),

    hasAvatar: Thing.common.flag(false),
    avatarFileExtension: Thing.common.fileExtension('jpg'),

    aliasNames: {
        flags: {update: true, expose: true},
        update: {
            validate: validateArrayItems(isName)
        }
    },

    isAlias: Thing.common.flag(),
    aliasedArtistRef: Thing.common.singleReference(Artist),

    // Update only

    albumData: Thing.common.wikiData(Album),
    artistData: Thing.common.wikiData(Artist),
    flashData: Thing.common.wikiData(Flash),
    trackData: Thing.common.wikiData(Track),

    // Expose only

    aliasedArtist: {
        flags: {expose: true},

        expose: {
            dependencies: ['artistData', 'aliasedArtistRef'],
            compute: ({ artistData, aliasedArtistRef }) => (
                (aliasedArtistRef && artistData
                    ? find.artist(aliasedArtistRef, artistData, {mode: 'quiet'})
                    : null)
            )
        }
    },

    tracksAsArtist: Artist.filterByContrib('trackData', 'artistContribs'),
    tracksAsContributor: Artist.filterByContrib('trackData', 'contributorContribs'),
    tracksAsCoverArtist: Artist.filterByContrib('trackData', 'coverArtistContribs'),

    tracksAsAny: {
        flags: {expose: true},

        expose: {
            dependencies: ['trackData'],

            compute: ({ trackData, [Artist.instance]: artist }) => (
                trackData?.filter(track => (
                    [
                        ...track.artistContribs,
                        ...track.contributorContribs,
                        ...track.coverArtistContribs
                    ].some(({ who }) => who === artist))))
        }
    },

    tracksAsCommentator: {
        flags: {expose: true},

        expose: {
            dependencies: ['trackData'],

            compute: ({ trackData, [Artist.instance]: artist }) => (
                trackData.filter(({ commentatorArtists }) => commentatorArtists?.includes(artist)))
        }
    },

    albumsAsAlbumArtist: Artist.filterByContrib('albumData', 'artistContribs'),
    albumsAsCoverArtist: Artist.filterByContrib('albumData', 'coverArtistContribs'),
    albumsAsWallpaperArtist: Artist.filterByContrib('albumData', 'wallpaperArtistContribs'),
    albumsAsBannerArtist: Artist.filterByContrib('albumData', 'bannerArtistContribs'),

    albumsAsCommentator: {
        flags: {expose: true},

        expose: {
            dependencies: ['albumData'],

            compute: ({ albumData, [Artist.instance]: artist }) => (
                albumData.filter(({ commentatorArtists }) => commentatorArtists?.includes(artist)))
        }
    },

    flashesAsContributor: Artist.filterByContrib('flashData', 'contributorContribs'),
};

Artist[S.serializeDescriptors] = {
    name: S.id,
    directory: S.id,
    urls: S.id,
    contextNotes: S.id,

    hasAvatar: S.id,
    avatarFileExtension: S.id,

    aliasNames: S.id,

    tracksAsArtist: S.toRefs,
    tracksAsContributor: S.toRefs,
    tracksAsCoverArtist: S.toRefs,
    tracksAsCommentator: S.toRefs,

    albumsAsAlbumArtist: S.toRefs,
    albumsAsCoverArtist: S.toRefs,
    albumsAsWallpaperArtist: S.toRefs,
    albumsAsBannerArtist: S.toRefs,
    albumsAsCommentator: S.toRefs,

    flashesAsContributor: S.toRefs,
};

// -> Group

Group.propertyDescriptors = {
    // Update & expose

    name: Thing.common.name('Unnamed Group'),
    directory: Thing.common.directory(),

    description: Thing.common.simpleString(),

    urls: Thing.common.urls(),

    // Update only

    albumData: Thing.common.wikiData(Album),
    groupCategoryData: Thing.common.wikiData(GroupCategory),

    // Expose only

    descriptionShort: {
        flags: {expose: true},

        expose: {
            dependencies: ['description'],
            compute: ({ description }) => description.split('<hr class="split">')[0]
        }
    },

    albums: {
        flags: {expose: true},

        expose: {
            dependencies: ['albumData'],
            compute: ({ albumData, [Group.instance]: group }) => (
                albumData?.filter(album => album.groups.includes(group)) ?? [])
        }
    },

    color: {
        flags: {expose: true},

        expose: {
            dependencies: ['groupCategoryData'],

            compute: ({ groupCategoryData, [Group.instance]: group }) => (
                groupCategoryData.find(category => category.groups.includes(group))?.color ?? null)
        }
    },

    category: {
        flags: {expose: true},

        expose: {
            dependencies: ['groupCategoryData'],
            compute: ({ groupCategoryData, [Group.instance]: group }) => (
                groupCategoryData.find(category => category.groups.includes(group)) ?? null)
        }
    },
};

GroupCategory.propertyDescriptors = {
    // Update & expose

    name: Thing.common.name('Unnamed Group Category'),
    color: Thing.common.color(),

    groupsByRef: Thing.common.referenceList(Group),

    // Update only

    groupData: Thing.common.wikiData(Group),

    // Expose only

    groups: Thing.common.dynamicThingsFromReferenceList('groupsByRef', 'groupData', find.group),
};

// -> ArtTag

ArtTag.propertyDescriptors = {
    // Update & expose

    name: Thing.common.name('Unnamed Art Tag'),
    directory: Thing.common.directory(),
    color: Thing.common.color(),
    isContentWarning: Thing.common.flag(false),

    // Update only

    albumData: Thing.common.wikiData(Album),
    trackData: Thing.common.wikiData(Track),

    // Expose only

    // Previously known as: (tag).things
    taggedInThings: {
        flags: {expose: true},

        expose: {
            dependencies: ['albumData', 'trackData'],
            compute: ({ albumData, trackData, [ArtTag.instance]: artTag }) => (
                sortByArtDate([...albumData, ...trackData]
                    .filter(thing => thing.artTags?.includes(artTag))))
        }
    }
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

            compute: ({ content }) => content.split('<hr class="split">')[0]
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

    // Update only

    // These aren't necessarily used by every HomepageLayoutRow subclass, but
    // for convenience of providing this data, every row accepts all wiki data
    // arrays depended upon by any subclass's behavior.
    albumData: Thing.common.wikiData(Album),
    groupData: Thing.common.wikiData(Group),
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

    // Expose only

    sourceGroup: Thing.common.dynamicThingFromSingleReference('sourceGroupByRef', 'groupData', find.group),
    sourceAlbums: Thing.common.dynamicThingsFromReferenceList('sourceAlbumsByRef', 'albumData', find.album),
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
            transform: value => (value === null ? null : value.toString())
        }
    },

    date: Thing.common.simpleDate(),

    coverArtFileExtension: Thing.common.fileExtension('jpg'),

    contributorContribsByRef: Thing.common.contribsByRef(),

    featuredTracksByRef: Thing.common.referenceList(Track),

    urls: Thing.common.urls(),

    // Update only

    artistData: Thing.common.wikiData(Artist),
    trackData: Thing.common.wikiData(Track),
    flashActData: Thing.common.wikiData(FlashAct),

    // Expose only

    contributorContribs: Thing.common.dynamicContribs('contributorContribsByRef'),

    featuredTracks: Thing.common.dynamicThingsFromReferenceList('featuredTracksByRef', 'trackData', find.track),

    act: {
        flags: {expose: true},

        expose: {
            dependencies: ['flashActData'],

            compute: ({ flashActData, [Flash.instance]: flash }) => (
                flashActData.find(act => act.flashes.includes(flash)) ?? null)
        }
    },

    color: {
        flags: {expose: true},

        expose: {
            dependencies: ['flashActData'],

            compute: ({ flashActData, [Flash.instance]: flash }) => (
                flashActData.find(act => act.flashes.includes(flash))?.color ?? null)
        }
    },
};

Flash[S.serializeDescriptors] = {
    name: S.id,
    page: S.id,
    directory: S.id,
    date: S.id,
    contributors: S.toContribRefs,
    tracks: S.toRefs,
    urls: S.id,
    color: S.id,
};

FlashAct.propertyDescriptors = {
    // Update & expose

    name: Thing.common.name('Unnamed Flash Act'),
    color: Thing.common.color(),
    anchor: Thing.common.simpleString(),
    jump: Thing.common.simpleString(),
    jumpColor: Thing.common.color(),

    flashesByRef: Thing.common.referenceList(Flash),

    // Update only

    flashData: Thing.common.wikiData(Flash),

    // Expose only

    flashes: Thing.common.dynamicThingsFromReferenceList('flashesByRef', 'flashData', find.flash),
};

// -> WikiInfo

WikiInfo.propertyDescriptors = {
    // Update & expose

    name: Thing.common.name('Unnamed Wiki'),

    // Displayed in nav bar.
    nameShort: {
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

    divideTrackListsByGroupsByRef: Thing.common.referenceList(Group),

    // Feature toggles
    enableFlashesAndGames: Thing.common.flag(false),
    enableListings: Thing.common.flag(false),
    enableNews: Thing.common.flag(false),
    enableArtTagUI: Thing.common.flag(false),
    enableGroupUI: Thing.common.flag(false),

    // Update only

    groupData: Thing.common.wikiData(Group),

    // Expose only

    divideTrackListsByGroups: Thing.common.dynamicThingsFromReferenceList('divideTrackListsByGroupsByRef', 'groupData', find.group),
};

// -> Language

const intlHelper = (constructor, opts) => ({
    flags: {expose: true},
    expose: {
        dependencies: ['code', 'intlCode'],
        compute: ({ code, intlCode }) => {
            const constructCode = intlCode ?? code;
            if (!constructCode) return null;
            return Reflect.construct(constructor, [constructCode, opts]);
        }
    }
});

Language.propertyDescriptors = {
    // Update & expose

    // General language code. This is used to identify the language distinctly
    // from other languages (similar to how "Directory" operates in many data
    // objects).
    code: {
        flags: {update: true, expose: true},
        update: {validate: isLanguageCode}
    },

    // Human-readable name. This should be the language's own native name, not
    // localized to any other language.
    name: Thing.common.simpleString(),

    // Language code specific to JavaScript's Internationalization (Intl) API.
    // Usually this will be the same as the language's general code, but it
    // may be overridden to provide Intl constructors an alternative value.
    intlCode: {
        flags: {update: true, expose: true},
        update: {validate: isLanguageCode},
        expose: {
            dependencies: ['code'],
            transform: (intlCode, { code }) => intlCode ?? code
        }
    },

    // Mapping of translation keys to values (strings). Generally, don't
    // access this object directly - use methods instead.
    strings: {
        flags: {update: true, expose: true},
        update: {validate: t => typeof t === 'object'},
        expose: {
            dependencies: ['inheritedStrings'],
            transform(strings, { inheritedStrings }) {
                if (strings || inheritedStrings) {
                    return {...inheritedStrings ?? {}, ...strings ?? {}};
                } else {
                    return null;
                }
            }
        }
    },

    // May be provided to specify "default" strings, generally (but not
    // necessarily) inherited from another Language object.
    inheritedStrings: {
        flags: {update: true, expose: true},
        update: {validate: t => typeof t === 'object'}
    },

    // Update only

    escapeHTML: Thing.common.externalFunction(),

    // Expose only

    intl_date: intlHelper(Intl.DateTimeFormat, {full: true}),
    intl_number: intlHelper(Intl.NumberFormat),
    intl_listConjunction: intlHelper(Intl.ListFormat, {type: 'conjunction'}),
    intl_listDisjunction: intlHelper(Intl.ListFormat, {type: 'disjunction'}),
    intl_listUnit: intlHelper(Intl.ListFormat, {type: 'unit'}),
    intl_pluralCardinal: intlHelper(Intl.PluralRules, {type: 'cardinal'}),
    intl_pluralOrdinal: intlHelper(Intl.PluralRules, {type: 'ordinal'}),

    validKeys: {
        flags: {expose: true},

        expose: {
            dependencies: ['strings', 'inheritedStrings'],
            compute: ({ strings, inheritedStrings }) => Array.from(new Set([
                ...Object.keys(inheritedStrings ?? {}),
                ...Object.keys(strings ?? {})
            ]))
        }
    },

    strings_htmlEscaped: {
        flags: {expose: true},
        expose: {
            dependencies: ['strings', 'inheritedStrings', 'escapeHTML'],
            compute({ strings, inheritedStrings, escapeHTML }) {
                if (!(strings || inheritedStrings) || !escapeHTML) return null;
                const allStrings = {...inheritedStrings ?? {}, ...strings ?? {}};
                return Object.fromEntries(Object.entries(allStrings)
                    .map(([ k, v ]) => [k, escapeHTML(v)]));
            }
        }
    },
};

const countHelper = (stringKey, argName = stringKey) => function(value, {unit = false} = {}) {
    return this.$(
        (unit
            ? `count.${stringKey}.withUnit.` + this.getUnitForm(value)
            : `count.${stringKey}`),
        {[argName]: this.formatNumber(value)});
};

Object.assign(Language.prototype, {
    $(key, args = {}) {
        return this.formatString(key, args);
    },

    assertIntlAvailable(property) {
        if (!this[property]) {
            throw new Error(`Intl API ${property} unavailable`);
        }
    },

    getUnitForm(value) {
        this.assertIntlAvailable('intl_pluralCardinal');
        return this.intl_pluralCardinal.select(value);
    },

    formatString(key, args = {}) {
        if (this.strings && !this.strings_htmlEscaped) {
            throw new Error(`HTML-escaped strings unavailable - please ensure escapeHTML function is provided`);
        }

        return this.formatStringHelper(this.strings_htmlEscaped, key, args);
    },

    formatStringNoHTMLEscape(key, args = {}) {
        return this.formatStringHelper(this.strings, key, args);
    },

    formatStringHelper(strings, key, args = {}) {
        if (!strings) {
            throw new Error(`Strings unavailable`);
        }

        if (!this.validKeys.includes(key)) {
            throw new Error(`Invalid key ${key} accessed`);
        }

        const template = strings[key];

        // Convert the keys on the args dict from camelCase to CONSTANT_CASE.
        // (This isn't an OUTRAGEOUSLY versatile algorithm for doing that, 8ut
        // like, who cares, dude?) Also, this is an array, 8ecause it's handy
        // for the iterating we're a8out to do.
        const processedArgs = Object.entries(args)
            .map(([ k, v ]) => [k.replace(/[A-Z]/g, '_$&').toUpperCase(), v]);

        // Replacement time! Woot. Reduce comes in handy here!
        const output = processedArgs.reduce(
            (x, [ k, v ]) => x.replaceAll(`{${k}}`, v),
            template);

        // Post-processing: if any expected arguments *weren't* replaced, that
        // is almost definitely an error.
        if (output.match(/\{[A-Z_]+\}/)) {
            throw new Error(`Args in ${key} were missing - output: ${output}`);
        }

        return output;
    },

    formatDate(date) {
        this.assertIntlAvailable('intl_date');
        return this.intl_date.format(date);
    },

    formatDateRange(startDate, endDate) {
        this.assertIntlAvailable('intl_date');
        return this.intl_date.formatRange(startDate, endDate);
    },

    formatDuration(secTotal, {approximate = false, unit = false} = {}) {
        if (secTotal === 0) {
            return this.formatString('count.duration.missing');
        }

        const hour = Math.floor(secTotal / 3600);
        const min = Math.floor((secTotal - hour * 3600) / 60);
        const sec = Math.floor(secTotal - hour * 3600 - min * 60);

        const pad = val => val.toString().padStart(2, '0');

        const stringSubkey = unit ? '.withUnit' : '';

        const duration = (hour > 0
            ? this.formatString('count.duration.hours' + stringSubkey, {
                hours: hour,
                minutes: pad(min),
                seconds: pad(sec)
            })
            : this.formatString('count.duration.minutes' + stringSubkey, {
                minutes: min,
                seconds: pad(sec)
            }));

        return (approximate
            ? this.formatString('count.duration.approximate', {duration})
            : duration);
    },

    formatIndex(value) {
        this.assertIntlAvailable('intl_pluralOrdinal');
        return this.formatString('count.index.' + this.intl_pluralOrdinal.select(value), {index: value});
    },

    formatNumber(value) {
        this.assertIntlAvailable('intl_number');
        return this.intl_number.format(value);
    },

    formatWordCount(value) {
        const num = this.formatNumber(value > 1000
            ? Math.floor(value / 100) / 10
            : value);

        const words = (value > 1000
            ? this.formatString('count.words.thousand', {words: num})
            : this.formatString('count.words', {words: num}));

        return this.formatString('count.words.withUnit.' + this.getUnitForm(value), {words});
    },

    // Conjunction list: A, B, and C
    formatConjunctionList(array) {
        this.assertIntlAvailable('intl_listConjunction');
        return this.intl_listConjunction.format(array);
    },

    // Disjunction lists: A, B, or C
    formatDisjunctionList(array) {
        this.assertIntlAvailable('intl_listDisjunction');
        return this.intl_listDisjunction.format(array);
    },

    // Unit lists: A, B, C
    formatUnitList(array) {
        this.assertIntlAvailable('intl_listUnit');
        return this.intl_listUnit.format(array);
    },

    // File sizes: 42.5 kB, 127.2 MB, 4.13 GB, 998.82 TB
    formatFileSize(bytes) {
        if (!bytes) return '';

        bytes = parseInt(bytes);
        if (isNaN(bytes)) return '';

        const round = exp => Math.round(bytes / 10 ** (exp - 1)) / 10;

        if (bytes >= 10 ** 12) {
            return this.formatString('count.fileSize.terabytes', {terabytes: round(12)});
        } else if (bytes >= 10 ** 9) {
            return this.formatString('count.fileSize.gigabytes', {gigabytes: round(9)});
        } else if (bytes >= 10 ** 6) {
            return this.formatString('count.fileSize.megabytes', {megabytes: round(6)});
        } else if (bytes >= 10 ** 3) {
            return this.formatString('count.fileSize.kilobytes', {kilobytes: round(3)});
        } else {
            return this.formatString('count.fileSize.bytes', {bytes});
        }
    },

    // TODO: These are hard-coded. Is there a better way?
    countAlbums: countHelper('albums'),
    countCommentaryEntries: countHelper('commentaryEntries', 'entries'),
    countContributions: countHelper('contributions'),
    countCoverArts: countHelper('coverArts'),
    countTimesReferenced: countHelper('timesReferenced'),
    countTimesUsed: countHelper('timesUsed'),
    countTracks: countHelper('tracks'),
});
