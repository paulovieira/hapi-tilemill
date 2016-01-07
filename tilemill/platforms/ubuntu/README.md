# Packaging

This document describes the packaging steps for TileMill on Ubuntu.

Debian packages, Launchpad PPA's, and a bit of elbow grease are the tools.


## Requirements

* Launchpad account: https://login.launchpad.net/+new_account
* Ubuntu machine with sudo that can be configured with launchpad keys.
* Debian packaging tools, git, and tilemill checkout

## Resources on packaging

These are high level resources you should look at before continuing:

* http://blog.launchpad.net/ppa/personal-package-archives-for-everyone
* https://wiki.ubuntu.com/PackagingGuide/Complete
* http://www.debian.org/doc/manuals/maint-guide


## Initial Setup

Install some debian packages:

    sudo apt-get install debhelper devscripts dput git-core cdbs pgpgpg

For more info on these requirements see: https://wiki.ubuntu.com/PackagingGuide/Complete#Packaging_Tools

Then create your PGP key and upload to launchpad. You can do this through the GUI tool "Passwords and Keys" or using `gpg --gen-key`.

Make sure to create entropy as the key is created by moving your mouse around or typing.

If you are on a headless server you can fake entropy by using `rng-tools` and setting your device to `/dev/urandom` (in `/etc/default/rng-tools`).

For more info on creating your key see: https://help.launchpad.net/YourAccount/ImportingYourPGPKey

Ensure your launchpad user has access to the PPA's at https://launchpad.net/~developmentseed


## Instructions for copying packages

The instructions below require copying of packages between PPA's. We do this to ensure 
proper dependencies (to avoid other PPA updates conflicting with what tilemill needs for versions) and to stage builds for testing.

Here is how to copy packages:

1) Go the the launchpad page for the PPA packages you want to copy from, like:

- [chris-lea/node.js](https://launchpad.net/~chris-lea/+archive/node.js/+copy-packages)
- [mapnik/nightly-trunk](https://launchpad.net/~mapnik/+archive/nightly-trunk/+copy-packages)

2) Select the packages you want to copy by checking their box. Confirm the proper package version and include each supported series.

3) Select the **Destination PPA**. Use MapBox Dev for testing packages. You'll only copy to MapBox when you are ready to publish, and you'll generally want to copy exiting packages from MapBox Dev after testing.

4) The **Destination series** should be set to **The same series**.

5) Select **Copy existing binaries**.

6) Click **Copy Packages** and wait for the packages to be copied.


## Packaging Steps

### Build or copy Mapnik packages

Mapnik master is what is usually needed for TileMill releases.

These can either be copied from https://launchpad.net/~mapnik/+archive/nightly-trunk into the
~developmentseed/mapbox-dev PPA or built and uploaded there directly.

To build them yourself follow the docs at:

    https://github.com/mapnik/mapnik-packaging/blob/master/debian-nightlies/README.md

### Copy nodejs packages

Copy the nodejs packages at the versions that work for TileMill.

### Setup TileMill

Locally, on your ubuntu machine checkout TileMill for a given tag:

    TAG="v0.8.0"
    git clone https://github.com/mapbox/tilemill tilemill-$TAG
    cd tilemill-$TAG
    git checkout $TAG

Add the PPA dependencies and install them:

    sudo apt-add-repository ppa:developmentseed/mapbox-dev
    sudo apt-get update
    sudo apt-get install libmapnik libmapnik-dev mapnik-input-plugin* nodejs libwebkit-dev

Now build TileMill:

    npm install

Grab local copy of node-gyp to ensure that the [hackish method to recompile](https://github.com/mapbox/tilemill/blob/3083b084b1e4b3cb23e105736328eb500d6d0f7a/platforms/ubuntu/debian/rules#L21) node-sqlite3 on launchpad works

    npm install node-gyp
    export PATH=`pwd`/node_modules/.bin/:${PATH}
    NVER=`node -e "console.log(process.versions.node)"`
    TILEMILL_ROOT=`pwd`
    BUILD_ROOT=${TILEMILL_ROOT}/node_root_dir
    cp -r ~/.node-gyp/${NVER}/ ${BUILD_ROOT}
    rm -rf ~/.node-gyp/
    CXX_MODULES=$(find ${TILEMILL_ROOT}/node_modules -name binding.gyp | sed 's,/binding.gyp,/,g')
    for i in ${CXX_MODULES}; do cd $i && node-gyp rebuild --nodedir=${BUILD_ROOT} && npm test; done
    cd ${TILEMILL_ROOT}

Note: all c++ modules must be rebuilt on launchpad.

### Package and upload

Now we need to create a package for every ubuntu distribution and upload it to launchpad.

There is a packaging script located in this directory (./platforms/ubuntu)
called `package.sh` which help with this step.

You add a single new changelog entry and then run the package.sh script, repeating
as many times as distributions you wish to target.

Packaging changes should increment the package version, while upstream source changes
should increment the minor/major version.  For example package-0.4.0-0ubuntu1 goes 
to package-0.4.0-0ubuntu2 for packaging changes. For upstream source changes, the 
minor or major version should change, like package-0.4.1-0ubuntu1. The packaging 
version always starts at 1.

Edit the changelog:

    ./platforms/ubuntu/debian/changelog

Note: your changelog name and email must match exactly the name and email you used to
create your gpg/pgp keys.

Do not commit this change to the tag, but rather apply it to the master branch
of Tilemill.

To create a testing package that will be built and uploaded to "mapbox-dev" PPA do:

    cd platforms/ubuntu
    ./package.sh

NOTE: if you make changes to tilemill sources you also need to remove the `orig` folder
that the package.sh creates.

Use the -p (production) flag to push a build up to the main "mapbox" PPA:

    ./package.sh -p

## Testing

Now, ideally on another machine add the `developmentseed/mapbox-dev` PPA and test
installing tilemill packages. If they work then you can deploy them by copying the
packages from the "mapbox-dev" PPA to the "mapbox" PPA.


## Testing builds with Pbuilder

If your package depends on other PPA's, as does TileMill and TileStream (nodejs,
for example), you can build a pbuilder chroot which will include those PPA's. 
For example, first use [this script in your ~/.pbuilderrc](https://wiki.ubuntu.com/PbuilderHowto#Multiple_pbuilders), then, when you create your pbuilder environment, run the command like:

```
sudo DIST=maverick pbuilder create --override-config --othermirror="\deb
http://ppa.launchpad.net/chris-lea/node.js/ubuntu maverick main |
deb http://ppa.launchpad.net/mapnik/nightly-trunk/ubuntu maverick main"
```

which will make sure the required PPA's are available within your pbuilder chroot when
running test builds.  To use this pbuilder, provided you've put the above linked
script into ~/.pbuilderrc, just run:

    sudo DIST=maverick pbuilder build tilemill_0.4.1-0.dsc

