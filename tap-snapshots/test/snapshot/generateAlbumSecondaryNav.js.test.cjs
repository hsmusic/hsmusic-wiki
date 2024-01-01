/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/snapshot/generateAlbumSecondaryNav.js > TAP > generateAlbumSecondaryNav (snapshot) > basic behavior, mode: album 1`] = `
<nav id="secondary-nav" class="nav-links-groups">
    <span style="--primary-color: #abcdef">
        <a href="group/vcg/">VCG</a>
        (<a href="album/first/" title="First">Previous</a>, <a href="album/last/" title="Last">Next</a>)
    </span>
    <span style="--primary-color: #123456">
        <a href="group/bepis/">Bepis</a>
        (<a href="album/second/" title="Second">Next</a>)
    </span>
</nav>
`

exports[`test/snapshot/generateAlbumSecondaryNav.js > TAP > generateAlbumSecondaryNav (snapshot) > basic behavior, mode: track 1`] = `
<nav id="secondary-nav" class="nav-links-groups">
    <a href="group/vcg/" style="--primary-color: #abcdef; --dim-color: #818181">VCG</a>
    <a href="group/bepis/" style="--primary-color: #123456; --dim-color: #000000">Bepis</a>
</nav>
`

exports[`test/snapshot/generateAlbumSecondaryNav.js > TAP > generateAlbumSecondaryNav (snapshot) > dateless album in mixed group 1`] = `
<nav id="secondary-nav" class="nav-links-groups">
    <a href="group/vcg/" style="--primary-color: #abcdef; --dim-color: #818181">VCG</a>
    <a href="group/bepis/" style="--primary-color: #123456; --dim-color: #000000">Bepis</a>
</nav>
`
