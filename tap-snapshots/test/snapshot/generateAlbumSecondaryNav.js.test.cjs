/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/snapshot/generateAlbumSecondaryNav.js > TAP > generateAlbumSecondaryNav (snapshot) > basic behavior, mode: album 1`] = `
<nav id="secondary-nav" class="album-secondary-nav with-previous-next">
    <span class="group-with-series">
        <span style="--primary-color: #abcdef"><a href="group/vcg/">VCG</a> (<span class="dot-switcher interpage"><span><a title="First" href="album/first/">Previous</a></span><span><a title="Last" href="album/last/">Next</a></span></span>)</span>
        <span class="series-nav-link" style="--primary-color: #abcdef"><a class="series" href="group/vcg/">Series</a> (<span class="dot-switcher interpage"><span><a class="inert-previous-next-link">Previous</a></span><span><a title="Last" href="album/last/">Next</a></span></span>)</span>
    </span>
    <span style="--primary-color: #123456"><a href="group/bepis/">Bepis</a> (<span class="dot-switcher interpage"><span><a class="inert-previous-next-link">Previous</a></span><span><a title="Second" href="album/second/">Next</a></span></span>)</span>
</nav>
`

exports[`test/snapshot/generateAlbumSecondaryNav.js > TAP > generateAlbumSecondaryNav (snapshot) > basic behavior, mode: track 1`] = `
<nav id="secondary-nav" class="album-secondary-nav">
    <span class="dot-switcher"><span>
            <span class="group-with-series">
                <span style="--primary-color: #abcdef"><a href="group/vcg/">VCG</a></span>
                <span class="series-nav-link" style="--primary-color: #abcdef"><a class="series" href="group/vcg/">Series</a></span>
            </span>
        </span><span><span style="--primary-color: #123456"><a href="group/bepis/">Bepis</a></span></span></span>
</nav>
`

exports[`test/snapshot/generateAlbumSecondaryNav.js > TAP > generateAlbumSecondaryNav (snapshot) > dateless album in mixed group 1`] = `
<nav id="secondary-nav" class="album-secondary-nav with-previous-next">
    <span style="--primary-color: #abcdef"><a href="group/vcg/">VCG</a></span>
    <span style="--primary-color: #123456"><a href="group/bepis/">Bepis</a></span>
</nav>
`
