/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/snapshot/generateAlbumTrackList.js > TAP > generateAlbumTrackList (snapshot) > basic behavior, default track section 1`] = `
<ul>
    <li>(0:20) <a href="track/t1/">Track 1</a></li>
    <li>[mocked: generateAlbumTrackListMissingDuration - slots: {}] <a href="track/t2/">Track 2</a></li>
    <li>(0:40) <a href="track/t3/">Track 3</a></li>
    <li style="--primary-color: #ea2e83">[mocked: generateAlbumTrackListMissingDuration - slots: {}] <a href="track/t4/">Track 4</a> <span class="by"><span class="chunkwrap">by <span class="contribution nowrap"><a href="artist/apricot/">Apricot</a></span>,</span> <span class="chunkwrap"><span class="contribution nowrap"><a href="artist/peach/">Peach</a></span>,</span> <span class="chunkwrap">and <span class="contribution nowrap"><a href="artist/cerise/">Cerise</a></span></span></span></li>
</ul>
`

exports[`test/snapshot/generateAlbumTrackList.js > TAP > generateAlbumTrackList (snapshot) > basic behavior, with track sections 1`] = `
<dl class="album-group-list">
    <dt class="content-heading" tabindex="0">
        <span class="content-heading-main-title">First section: (~1:00)</span>
        <template class="content-heading-sticky-title">First section:</template>
    </dt>
    <dd>
        <ul>
            <li>(0:20) <a href="track/t1/">Track 1</a></li>
            <li>[mocked: generateAlbumTrackListMissingDuration - slots: {}] <a href="track/t2/">Track 2</a></li>
            <li>(0:40) <a href="track/t3/">Track 3</a></li>
        </ul>
    </dd>
    <dt class="content-heading" tabindex="0">
        <span class="content-heading-main-title">Second section:</span>
        <template class="content-heading-sticky-title">Second section:</template>
    </dt>
    <dd><ul><li style="--primary-color: #ea2e83">[mocked: generateAlbumTrackListMissingDuration - slots: {}] <a href="track/t4/">Track 4</a> <span class="by"><span class="chunkwrap">by <span class="contribution nowrap"><a href="artist/apricot/">Apricot</a></span>,</span> <span class="chunkwrap"><span class="contribution nowrap"><a href="artist/peach/">Peach</a></span>,</span> <span class="chunkwrap">and <span class="contribution nowrap"><a href="artist/cerise/">Cerise</a></span></span></span></li></ul></dd>
</dl>
`

exports[`test/snapshot/generateAlbumTrackList.js > TAP > generateAlbumTrackList (snapshot) > collapseDurationScope: album 1`] = `
<dl class="album-group-list">
    <dt class="content-heading" tabindex="0">
        <span class="content-heading-main-title">First section: (~1:00)</span>
        <template class="content-heading-sticky-title">First section:</template>
    </dt>
    <dd>
        <ul>
            <li>(0:20) <a href="track/t1/">Track 1</a></li>
            <li>[mocked: generateAlbumTrackListMissingDuration - slots: {}] <a href="track/t2/">Track 2</a></li>
            <li>(0:40) <a href="track/t3/">Track 3</a></li>
        </ul>
    </dd>
    <dt class="content-heading" tabindex="0">
        <span class="content-heading-main-title">Second section:</span>
        <template class="content-heading-sticky-title">Second section:</template>
    </dt>
    <dd><ul><li style="--primary-color: #ea2e83">[mocked: generateAlbumTrackListMissingDuration - slots: {}] <a href="track/t4/">Track 4</a> <span class="by"><span class="chunkwrap">by <span class="contribution nowrap"><a href="artist/apricot/">Apricot</a></span>,</span> <span class="chunkwrap"><span class="contribution nowrap"><a href="artist/peach/">Peach</a></span>,</span> <span class="chunkwrap">and <span class="contribution nowrap"><a href="artist/cerise/">Cerise</a></span></span></span></li></ul></dd>
</dl>
<ul>
    <li>(0:20) <a href="track/t1/">Track 1</a></li>
    <li>[mocked: generateAlbumTrackListMissingDuration - slots: {}] <a href="track/t2/">Track 2</a></li>
    <li>(0:40) <a href="track/t3/">Track 3</a></li>
    <li style="--primary-color: #ea2e83">[mocked: generateAlbumTrackListMissingDuration - slots: {}] <a href="track/t4/">Track 4</a> <span class="by"><span class="chunkwrap">by <span class="contribution nowrap"><a href="artist/apricot/">Apricot</a></span>,</span> <span class="chunkwrap"><span class="contribution nowrap"><a href="artist/peach/">Peach</a></span>,</span> <span class="chunkwrap">and <span class="contribution nowrap"><a href="artist/cerise/">Cerise</a></span></span></span></li>
</ul>
<ul>
    <li><a href="track/t2/">Track 2</a></li>
    <li style="--primary-color: #ea2e83"><a href="track/t4/">Track 4</a> <span class="by"><span class="chunkwrap">by <span class="contribution nowrap"><a href="artist/apricot/">Apricot</a></span>,</span> <span class="chunkwrap"><span class="contribution nowrap"><a href="artist/peach/">Peach</a></span>,</span> <span class="chunkwrap">and <span class="contribution nowrap"><a href="artist/cerise/">Cerise</a></span></span></span></li>
</ul>
`

exports[`test/snapshot/generateAlbumTrackList.js > TAP > generateAlbumTrackList (snapshot) > collapseDurationScope: never 1`] = `
<dl class="album-group-list">
    <dt class="content-heading" tabindex="0">
        <span class="content-heading-main-title">First section: (~1:00)</span>
        <template class="content-heading-sticky-title">First section:</template>
    </dt>
    <dd>
        <ul>
            <li>(0:20) <a href="track/t1/">Track 1</a></li>
            <li>[mocked: generateAlbumTrackListMissingDuration - slots: {}] <a href="track/t2/">Track 2</a></li>
            <li>(0:40) <a href="track/t3/">Track 3</a></li>
        </ul>
    </dd>
    <dt class="content-heading" tabindex="0">
        <span class="content-heading-main-title">Second section:</span>
        <template class="content-heading-sticky-title">Second section:</template>
    </dt>
    <dd><ul><li style="--primary-color: #ea2e83">[mocked: generateAlbumTrackListMissingDuration - slots: {}] <a href="track/t4/">Track 4</a> <span class="by"><span class="chunkwrap">by <span class="contribution nowrap"><a href="artist/apricot/">Apricot</a></span>,</span> <span class="chunkwrap"><span class="contribution nowrap"><a href="artist/peach/">Peach</a></span>,</span> <span class="chunkwrap">and <span class="contribution nowrap"><a href="artist/cerise/">Cerise</a></span></span></span></li></ul></dd>
</dl>
<ul>
    <li>(0:20) <a href="track/t1/">Track 1</a></li>
    <li>[mocked: generateAlbumTrackListMissingDuration - slots: {}] <a href="track/t2/">Track 2</a></li>
    <li>(0:40) <a href="track/t3/">Track 3</a></li>
    <li style="--primary-color: #ea2e83">[mocked: generateAlbumTrackListMissingDuration - slots: {}] <a href="track/t4/">Track 4</a> <span class="by"><span class="chunkwrap">by <span class="contribution nowrap"><a href="artist/apricot/">Apricot</a></span>,</span> <span class="chunkwrap"><span class="contribution nowrap"><a href="artist/peach/">Peach</a></span>,</span> <span class="chunkwrap">and <span class="contribution nowrap"><a href="artist/cerise/">Cerise</a></span></span></span></li>
</ul>
<ul>
    <li>[mocked: generateAlbumTrackListMissingDuration - slots: {}] <a href="track/t2/">Track 2</a></li>
    <li style="--primary-color: #ea2e83">[mocked: generateAlbumTrackListMissingDuration - slots: {}] <a href="track/t4/">Track 4</a> <span class="by"><span class="chunkwrap">by <span class="contribution nowrap"><a href="artist/apricot/">Apricot</a></span>,</span> <span class="chunkwrap"><span class="contribution nowrap"><a href="artist/peach/">Peach</a></span>,</span> <span class="chunkwrap">and <span class="contribution nowrap"><a href="artist/cerise/">Cerise</a></span></span></span></li>
</ul>
`

exports[`test/snapshot/generateAlbumTrackList.js > TAP > generateAlbumTrackList (snapshot) > collapseDurationScope: section 1`] = `
<dl class="album-group-list">
    <dt class="content-heading" tabindex="0">
        <span class="content-heading-main-title">First section: (~1:00)</span>
        <template class="content-heading-sticky-title">First section:</template>
    </dt>
    <dd>
        <ul>
            <li>(0:20) <a href="track/t1/">Track 1</a></li>
            <li>[mocked: generateAlbumTrackListMissingDuration - slots: {}] <a href="track/t2/">Track 2</a></li>
            <li>(0:40) <a href="track/t3/">Track 3</a></li>
        </ul>
    </dd>
    <dt class="content-heading" tabindex="0">
        <span class="content-heading-main-title">Second section:</span>
        <template class="content-heading-sticky-title">Second section:</template>
    </dt>
    <dd><ul><li style="--primary-color: #ea2e83"><a href="track/t4/">Track 4</a> <span class="by"><span class="chunkwrap">by <span class="contribution nowrap"><a href="artist/apricot/">Apricot</a></span>,</span> <span class="chunkwrap"><span class="contribution nowrap"><a href="artist/peach/">Peach</a></span>,</span> <span class="chunkwrap">and <span class="contribution nowrap"><a href="artist/cerise/">Cerise</a></span></span></span></li></ul></dd>
</dl>
<ul>
    <li>(0:20) <a href="track/t1/">Track 1</a></li>
    <li>[mocked: generateAlbumTrackListMissingDuration - slots: {}] <a href="track/t2/">Track 2</a></li>
    <li>(0:40) <a href="track/t3/">Track 3</a></li>
    <li style="--primary-color: #ea2e83">[mocked: generateAlbumTrackListMissingDuration - slots: {}] <a href="track/t4/">Track 4</a> <span class="by"><span class="chunkwrap">by <span class="contribution nowrap"><a href="artist/apricot/">Apricot</a></span>,</span> <span class="chunkwrap"><span class="contribution nowrap"><a href="artist/peach/">Peach</a></span>,</span> <span class="chunkwrap">and <span class="contribution nowrap"><a href="artist/cerise/">Cerise</a></span></span></span></li>
</ul>
<ul>
    <li><a href="track/t2/">Track 2</a></li>
    <li style="--primary-color: #ea2e83"><a href="track/t4/">Track 4</a> <span class="by"><span class="chunkwrap">by <span class="contribution nowrap"><a href="artist/apricot/">Apricot</a></span>,</span> <span class="chunkwrap"><span class="contribution nowrap"><a href="artist/peach/">Peach</a></span>,</span> <span class="chunkwrap">and <span class="contribution nowrap"><a href="artist/cerise/">Cerise</a></span></span></span></li>
</ul>
`

exports[`test/snapshot/generateAlbumTrackList.js > TAP > generateAlbumTrackList (snapshot) > collapseDurationScope: track 1`] = `
<dl class="album-group-list">
    <dt class="content-heading" tabindex="0">
        <span class="content-heading-main-title">First section: (~1:00)</span>
        <template class="content-heading-sticky-title">First section:</template>
    </dt>
    <dd>
        <ul>
            <li>(0:20) <a href="track/t1/">Track 1</a></li>
            <li><a href="track/t2/">Track 2</a></li>
            <li>(0:40) <a href="track/t3/">Track 3</a></li>
        </ul>
    </dd>
    <dt class="content-heading" tabindex="0">
        <span class="content-heading-main-title">Second section:</span>
        <template class="content-heading-sticky-title">Second section:</template>
    </dt>
    <dd><ul><li style="--primary-color: #ea2e83"><a href="track/t4/">Track 4</a> <span class="by"><span class="chunkwrap">by <span class="contribution nowrap"><a href="artist/apricot/">Apricot</a></span>,</span> <span class="chunkwrap"><span class="contribution nowrap"><a href="artist/peach/">Peach</a></span>,</span> <span class="chunkwrap">and <span class="contribution nowrap"><a href="artist/cerise/">Cerise</a></span></span></span></li></ul></dd>
</dl>
<ul>
    <li>(0:20) <a href="track/t1/">Track 1</a></li>
    <li><a href="track/t2/">Track 2</a></li>
    <li>(0:40) <a href="track/t3/">Track 3</a></li>
    <li style="--primary-color: #ea2e83"><a href="track/t4/">Track 4</a> <span class="by"><span class="chunkwrap">by <span class="contribution nowrap"><a href="artist/apricot/">Apricot</a></span>,</span> <span class="chunkwrap"><span class="contribution nowrap"><a href="artist/peach/">Peach</a></span>,</span> <span class="chunkwrap">and <span class="contribution nowrap"><a href="artist/cerise/">Cerise</a></span></span></span></li>
</ul>
<ul>
    <li><a href="track/t2/">Track 2</a></li>
    <li style="--primary-color: #ea2e83"><a href="track/t4/">Track 4</a> <span class="by"><span class="chunkwrap">by <span class="contribution nowrap"><a href="artist/apricot/">Apricot</a></span>,</span> <span class="chunkwrap"><span class="contribution nowrap"><a href="artist/peach/">Peach</a></span>,</span> <span class="chunkwrap">and <span class="contribution nowrap"><a href="artist/cerise/">Cerise</a></span></span></span></li>
</ul>
`
