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
        (<a title="First" href="album/first/">Previous</a>, <a title="Last" href="album/last/">Next</a>)
    </span>
    <span style="--primary-color: #123456">
        <a href="group/bepis/">Bepis</a>
        (<a title="Second" href="album/second/">Next</a>)
    </span>
</nav>
`

exports[`test/snapshot/generateAlbumSecondaryNav.js > TAP > generateAlbumSecondaryNav (snapshot) > basic behavior, mode: track 1`] = `
<nav id="secondary-nav" class="nav-links-groups">
    <a style="--primary-color: #abcdef" href="group/vcg/">VCG</a>
    <a style="--primary-color: #123456" href="group/bepis/">Bepis</a>
</nav>
`

exports[`test/snapshot/generateAlbumSecondaryNav.js > TAP > generateAlbumSecondaryNav (snapshot) > dateless album in mixed group 1`] = `
<nav id="secondary-nav" class="nav-links-groups">
    <a style="--primary-color: #abcdef" href="group/vcg/">VCG</a>
    <a style="--primary-color: #123456" href="group/bepis/">Bepis</a>
</nav>
`
