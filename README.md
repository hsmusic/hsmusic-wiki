# HSMusic

HSMusic, short for the *Homestuck Music Wiki*, is a revitalization and reimagining of [earlier][fandom] [projects][nsnd] archiving and celebrating the expansive history of Homestuck official and fan music. Roughly periodic releases of the website are released at [hsmusic.wiki][hsmusic]; all development occurs in a few different public Git repositories:

- hsmusic-wiki ([GitHub][github-code], [Notabug][notabug-code], [cgit][cgit-code]): all the code used to run hsmusic on your own computer, and the canonical reference for all of the wiki's software behavior
- hsmusic-data ([GitHub][github-data], [Notabug][notabug-data], [cgit][cgit-data]): all the data representing the contents of the wiki; collaborative additions and improvements to wiki content all end up here
- hsmusic-media ([GitHub][github-media]): media files referenced by content in the data repository; includes all album assets, commentary images, additional files, etc
- hsmusic-lang ([GitHub][github-lang]): localization files for presenting the wiki's user interface in different languages

## Quick Start

Install dependencies:

- [Node.js](https://nodejs.org/en/) - we recommend using [nvm](https://github.com/nvm-sh/nvm) to install Node and keep easy track of any versions you've got installed; development is generally tested on latest but 20.x LTS should also work
- [ImageMagick](https://imagemagick.org/) - check your package manager if it's available (e.g. apt or homebrew) or follow [installation info right from the official website](https://imagemagick.org/script/download.php)

Make a new empty folder for storing all your wiki repositories, then clone 'em with git:

```
$ cd /path/to/my/projects/
$ mkdir hsmusic
$ cd hsmusic
$ git clone https://github.com/hsmusic/hsmusic-wiki code
Cloning into 'code'...
$ git clone https://github.com/hsmusic/hsmusic-data data
Cloning into 'data'...
$ git clone https://github.com/hsmusic/hsmusic-media media
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

Go back to the main directory (containing all the repos) and make a couple of empty folders that will be useful during builds:

```
$ cd ..

$ pwd
/path/to/my/projects/hsmusic
$ ls
code/  data/  media/
# If you don't see the above info, you've moved to the wrong directory.
# Just do cd /path/to/my/projects/hsmusic (with whatever path you created
# the main directory in) to get back.

$ mkdir cache
$ mkdir out
```

**Anytime a command shows `hsmusic` in the following examples,** if your `npm link` command didn't work or you get a "command not found" error, you can just replace `hsmusic` with `node code`.

The wiki uses thumbnails, but these aren't included in the media repository you downloaded. The wiki will automatically generate new thumbnails as you add them to the media repository (as part of each build), but the first time, you should just generate the thumbnails.

```
$ hsmusic --data-path data --media-path media --cache-path cache --thumbs-only
```

Provided you've got ImageMagick installed, this should go more or less error-free, although it may take a while (for the Homestuck Music Wiki, typically 40-80 minutes). It may fail to generate a few thumbnails, and will show an error message, if so. Just run the command again, and they should work the second time around.

Then build the site. There are two methods for this. **If you're publishing to the web** (or just want a complete, static build of the site for your own purposes), use `--static-build`, as below:

```
$ hsmusic --static-build --data-path data --media-path media --cache-path cache --out-path out
```

The site's contents will generate in the specified `out` folder. For the Homestuck Music Wiki, this generally takes around 40-60 minutes. You can upload these to a web server if you'd like to publish the site online. Or run your HTTP server of choice (`npx http-server -p 8002`, `python3 -m http.server 8002`) to view the build locally.

**If you're testing out your changes** (for example, before filing a pull request), use `--live-dev-server`, as below:

```
$ hsmusic --live-dev-server --data-path data --media-path media --cache-path cache
```

Once initial loading is complete (usually 8-16 seconds), the site will generate pages *as you open them in your web browser.* Open http://localhost:8002/ when hsmusic instructs you to. You have to restart the server to refresh its data and see any data changes you've saved; hold control and press C (^C) to cancel the build, then run the command again to restart the server.

### Help! It's not working

**If you encounter any errors along the way, or would like help getting the wiki working,** please feel welcomed to reach out through the [HSMusic Community Discord Server][discord]. We're a fairly active group there and are always happy to help! **This also applies if you don't have much experience with Git, GitHub, Node, or any of the necessary tooling, and want help getting used to them.**

### Building without writing `--data-path` (etc) every time

(These specific instructions apply only for bash and zsh. If you're using another shell, e.g. on Windows, you can probably adapt the principles, but we don't have a ready-to-go script, yet. Sorry!)

It can be mildly inconvenient to write (or remember to write, or copy-paste) the `--data-path data` option, and similar options, every time. hsmusic will also detect and use environment variables for these; if you specify them this way, you don't need to provide the corresponding command line options.

Suppose you've locally organized your wiki repositories as below:

    path/to/my/projects/
      hsmusic/
        cache/  <empty directory, or cached generated files>
        code/   <clone of hsmusic-wiki>
        data/   <clone of hsmusic-data>
        media/  <clone of hsmusic-media>
        out/    <empty directory, or a static build>

Create an `env.sh` file inside the top-level `hsmusic` folder, containing `data`, `media`, etc. If your shell is **bash,** enter these contents:

    #!/bin/bash
    base="$(realpath "$(dirname ${BASH_SOURCE[0]})")"
    export HSMUSIC_CACHE="$base/cache/"
    export HSMUSIC_DATA="$base/data/"
    export HSMUSIC_MEDIA="$base/media/"
    export HSMUSIC_OUT="$base/out/"

If your shell is **zsh,** enter these contents:

    #!/usr/bin/env zsh
    base=${0:a:h}
    export HSMUSIC_CACHE="$base/cache/"
    export HSMUSIC_DATA="$base/data/"
    export HSMUSIC_MEDIA="$base/media/"
    export HSMUSIC_OUT="$base/out/"

Then use `source env.sh` when starting work from the CLI to get access to all the convenient environment variables.

  [discord]: https://hsmusic.wiki/discord/
  [fandom]: https://homestuck-and-mspa-music.fandom.com/wiki/Homestuck_and_MSPA_Music_Wiki
  [cgit-code]: https://nebula.ed1.club/git/hsmusic-wiki
  [cgit-data]: https://nebula.ed1.club/git/hsmusic-data
  [github-code]: https://github.com/hsmusic/hsmusic-wiki
  [github-data]: https://github.com/hsmusic/hsmusic-data
  [github-lang]: https://github.com/hsmusic/hsmusic-lang
  [github-media]: https://github.com/hsmusic/hsmusic-media
  [hsmusic]: https://hsmusic.wiki
  [notabug-code]: https://notabug.org/towerofnix/hsmusic-wiki
  [notabug-data]: https://notabug.org/towerofnix/hsmusic-data
  [nsnd]: https://homestuck.net/music/references.html
