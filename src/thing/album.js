import Thing from './thing.js';

import {
    validateReference
} from './structures.js';

import {
    showAggregate,
    withAggregate
} from '../util/sugar.js';

export default class Album extends Thing {
    #tracks;

    static updateError = {
        tracks: Thing.extendPropertyError('tracks')
    };

    update(source) {
        withAggregate(({ wrap, call, map }) => {
            if (source.tracks) {
                this.#tracks = map(source.tracks, validateReference('track'), {
                    errorClass: this.constructor.updateError.tracks
                });
            }
        });
    }
}

const album = new Album();

try {
    album.update({
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
