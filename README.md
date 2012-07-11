This is a terrible makeshift [Thimble][] gallery.

## Prerequisites

Redis, Node, and PhantomJS.

## Quick Start

    git clone git://github.com/toolness/thimble-gallery-lol.git
    cd thimble-gallery-lol
    npm install
    cp config.sample.js config.js
    
Edit `config.js` to taste, then:

    npm test
    node run-app.js

Then browse to the port specified by `config.appPort` (default 3000).

  [Thimble]: https://thimble.webmaker.org/
