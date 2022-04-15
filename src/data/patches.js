export class PatchManager {
    patches = [];
}

export class Patch {
    static type = class {};

    static inputDescriptors = {};
    static outputDescriptors = {};
}

const patches = {};

patches.common = {};

Object.assign(patches.common, {
});

patches.hsmusic = {};

Object.assign(patches.hsmusic, {
    Album: class extends Patch {},
    Artist: class extends Patch {},
    Track: class extends Patch {},
});
