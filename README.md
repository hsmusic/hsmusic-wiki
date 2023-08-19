# HSMusic

HSMusic, short for the *Homestuck Music Wiki*, is a revitalization and reimagining of [earlier][fandom] [projects][nsnd] archiving and celebrating the expansive history of Homestuck official and fan music. Roughly periodic releases of the website are released at [hsmusic.wiki][hsmusic]; all development occurs in this public Git repository, which can be accessed at [github.com][github].

## Quick Start

Install dependencies:

- [Node.js](https://nodejs.org/en/) - we recommend using [nvm](https://github.com/nvm-sh/nvm) to install Node and keep easy track of any versions you've got installed; development is generally tested on latest but 16.x LTS should also work
- [ImageMagick](https://imagemagick.org/) - check your package manager if it's available (e.g. apt or homebrew) or follow [installation info right from the official website](https://imagemagick.org/script/download.php)

Make a new empty folder for storing all your HSMusic repositories, then clone 'em with git:

```
$ cd /path/to/my/projects/
$ mkdir hsmusic
$ cd hsmusic
$ git clone https://github.com/hsmusic/hsmusic-wiki code
Cloning into 'code'...
$ git clone https://github.com/hsmusic/hsmusic-data data
Cloning into 'data'...
$ git clone https://nebula.ed1.club/git/hsmusic-media media
Cloning into 'media'...
```

Install NPM dependencies (packages) used by HSMusic:

```
$ cd code
$ npm install
added 413 packages, and audited 612 packages in 10s
```

Optionally, use `npm link` to make `hsmusic` available from the command line anywhere on your device:

```
$ npm link
# This doesn't work reliably on every device. If it shows
# an error about permissions (and you aren't interested in
# working out the details yourself), you can just move on.
```

Go back to the main directory (containing all the repos) and make an empty folder for the first and subsequent builds:

```
$ cd ..

$ pwd
/path/to/my/projects/hsmusic
$ ls
code/  data/  media/
# If you don't see the above info, you've moved to the wrong directory.
# Just do cd /path/to/my/projects/hsmusic (with whatever path you created
# the main directory in) to get back.

$ mkdir out
```

Then build the site:

```
# If you used npm link:
$ hsmusic --data-path data --media-path media --out-path out

# If you didn't:
$ node code/src/upd8.js --data-path data --media-path media --out-path out
```

You should get a bunch of info eventually showing the site building! It may take a while (especially since HSMusic has a lot of data nowadays).

If all goes according to plan and there aren't any errors, all the site HTML should have been written to the `out` directory. Use a simple HTTP server to view it in your browser:

```
$ cd site

# choose your favorite HTTP server
$ npx http-server -p 8002
$ python3 -m http.server 8002
$ python2 -m SimpleHTTPServer 8002
```

If you don't have access to an HTTP server or lack device permissions to run one, you can also just view the generated HTML files in your browser and *most* features should still work. (Try `--append-index-html` in the `hsmusic`/`upd8.js` command to make generated links more direct.) This isn't an officially supported way to develop, so there might be bugs, but most of the site should still work.

**If you encounter any errors along the way, or would like help getting the wiki working,** please feel welcomed to reach out through the [HSMusic Community Discord Server][discord]. We're a fairly active group there and are always happy to help! **This also applies if you don't have much experience with Git, GitHub, Node, or any of the necessary tooling, and want help getting used to them.**

## Project Structure

### General build process

When you run HSMusic to build the wiki, several processes happen in succession. Any errors along the way will be reported - we hope with human-readable feedback, but [pop by the Discord][discord] if you have any questions or need help understanding errors or parts of the code.

1. Update thumbnails in the media repo so that any new images automatically get thumbnails.
2. Locate and read data files, processing them into relatively usable JS object-style formats.
3. Validate the data and show any errors caught during processing.
4. Create symlinks for static files and generate the basic directory structure for the site.
5. Generate and write HTML files (and any supporting files) containing all content.

### Multiple repositories

HSMusic works using a number of repositories in tandem:

- [`hsmusic-wiki`][github-code] (colloquially "code"): The code repository, including all behavior required to process data and content from the other repositories and turn it into an actual website. This is probably the repo you're viewing right now.
  - Code is written entirely in modern JavaScript, with the actual website a static combination of HTML and CSS (with inexhaustive JavaScript for certain features).
  - More details about the code repository below.
- [`hsmusic-data`][github-data]: The data repository, comprising all the data which makes a given wiki what it *is*. The repository linked here is for the [Homestuck Music Wiki][hsmusic] itself, but it may be swapped out for other data repos to build other completely different wikis.
  - This repo covers albums, tracks, artists, groups, and a variety of other things which make up the content of a music wiki.
  - The data repo also contains all the metadata which makes one wiki unique from another: layout info, static pages (like "About & Credits"), whether or not certain site features are enabled (like "Flashes & Games" or UI for browsing groups), and so on.
  - All data is written and accessed in the YAML format, and every file follows a specific structure described within this (code) repository. See below and the `src/data` directory for details.
- [`hsmusic-media`][ed1-media]: The media repository, holding all album, track, and layout media used across the site in one place. Media and organization directly corresponds to entries in the data repository; generally the data and media repositories go together and are swapped out for another together.
- *Language repo:* The language repository, holding up-to-date strings and other localization info for HSMusic. NB: This repo isn't currently online as its structure and tooling haven't been polished or properly put together yet, but it's not required for building the site.
  - Strings and language info are stored in top-level JSON files within this repository. They're based off the `src/strings-default.json` file within the code repo (and don't need to provide translations for all strings to be used for site building).

The code repository as well as the data and media repositories are require for site building, with the language repo optionally provided to add localization support to the wiki build.

The path to each repo may be specified respectively by the `--data-path`, `--media-path`, and `--lang-path` arguments (when building the site or using e.g. data-related CLI tools). If you find it inconvenient to type or keep track of these values, you may alternatively set environment variables `HSMUSIC_DATA`, `HSMUSIC_MEDIA`, and `HSMUSIC_LANG` to provide the same values. One convenient layout for locally organizing the HSMusic repositories is shown below:

    path/to/my/projects/
      hsmusic/
        code/   <clone of hsmusic-wiki>
        data/   <clone of hsmusic-data>
        media/  <clone of hsmusic-media>
        out/    <empty directory> (will be overwritten)
        env.sh

The `env.sh` script shown above is a straightforward utility for loading those variables into the envronment, so you don't need to type path arguments every time:

    #!/bin/bash
    base="$(realpath "$(dirname ${BASH_SOURCE[0]})")"
    export HSMUSIC_DATA="$base/data/"
    export HSMUSIC_MEDIA="$base/media/"
    # export HSMUSIC_LANG="$base/lang/" # uncomment if present
    export HSMUSIC_OUT="$base/out/"

Then use `source env.sh` when starting work from the CLI to get access to all the convenient environment variables. (This setup is written for Bash of course, but you can use the same idea to export env variables with your own shell's syntax.)

### Code repository source structure

The source code for HSMusic is divided across a number of source files, loosely grouped together in a number of directories:

- `src/`
  - `data/`
    - `cacheable-object.js`: Backbone of how data objects (colloquially "things") store, share, and compute their properties
    - `things.js`: Descriptors for all "thing" classes used across the wiki: albums, tracks, artists, groups, etc
    - `validators.js`: Convenient error-throwing utilities which help ensure properties set on things follow the right format
    - `yaml.js`: Mappings from YAML documents (the format used in `hsmusic-data`) to things (actual data objects), and a full set of utilities used to actually load that data from scratch
  - `page/`
    - All page templates (HTML content and layout metadata) are kept in source files under this directory
  - `static/`
    - Purely client-side files are kept here, e.g. site CSS, icon SVGs, and client-side JS
  - `util/`
    - Common utilities which generally may be accessed from both Node.js or the client (web browser)
  - `upd8.js`: Main entry point which controls and directs site generation from start to finish
  - `gen-thumbs.js`: Standalone utility also called every time HSMusic is run (unless `--skip-thumbs` is provided) which keeps a persistent cache of media MD5s and (re)generates thumbnails for new or updated image files
  - `repl.js`: Standalone utility for loading all wiki data and providing a convenient REPL to run filters and transformations on data objects right from the Node.js command line
  - `listing-spec.js`: Descriptors for computations and HTML templates used for the Listings part of the site
  - `url-spec.js`: Index of output paths where generated HTML ends up; also controls where `<a>`, `<img>`, etc tags link
  - `file-size-preloader.js`: Simple utility for calculating size of files in media directory
  - `strings-default.json`: Template for localization strings and index of default (English) strings used all across the site layout

## Forking

hsmusic is a relatively generic music wiki software, so you're more than encouraged to create a fork for your own archival or cataloguing purposes! You're encouraged to [drop us a link][feedback] if you do - we'd love to hear from you.

## Pull Requests

As mentioned, part of the focus of the hsmusic.wiki release, as well as most development since, has been to create a more modular and developer-friendly repository. So, on the curious chance anyone would like to contribute code to the repo, that's more possible now than it used to be!

Still, for larger additions, we encourage you to [drop the main dev an email][feedback] or, better yet, [pop by the Discord][discord] before writing all the implementation code: besides code tips which might make your life a bit easier (questions are welcome), we also love to discuss feature designs and values while they're still being brainstormed! That way, nobody has to tell you there are fundamental ideas or implementation details that should be rebuilt from the ground up - the last thing we want is anyone putting hours into code that has to be replaced by another implementation before it ever ends up part of the wiki!

As ever, feedback is always welcome, and may be shared via the usual links. Thank you for checking the repository out!

  [ed1-media]: https://nebula.ed1.club/git/hsmusic-media/
  [discord]: https://hsmusic.wiki/discord/
  [fandom]: https://homestuck-and-mspa-music.fandom.com/wiki/Homestuck_and_MSPA_Music_Wiki
  [feedback]: https://hsmusic.wiki/feedback/
  [github]: https://github.com/hsmusic/hsmusic-wiki
  [github-code]: https://github.com/hsmusic/hsmusic-wiki
  [github-data]: https://github.com/hsmusic/hsmusic-data
  [hsmusic]: https://hsmusic.wiki
  [nsnd]: https://homestuck.net/music/references.html
