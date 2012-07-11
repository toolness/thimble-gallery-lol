module.exports = {
  // Where all the published pages are.
  baseThimbleURL: "https://thimble.webmaker.org/p/",
  // Where to store screencaps of published pages.
  imageDir: "../images",
  // The HTTP port that the gallery web app listens on.
  appPort: 3000,
  // The HTTP port that the PhantomJS screen cap app listens on.
  screencapPort: 9012,
  // A secret that the PhantomJS app uses for access control, since
  // it doesn't currently appear to be possible to bind PhantomJS to
  // 127.0.0.1 only.
  secret: "grGORef",
  // HTTP basic auth info. Remove this key if you don't want to
  // protect the gallery with HTTP basic auth.
  auth: {
    username: 'blarg',
    password: 'blarg'
  },
  // Redis info. Leave port/host at null to use Redis defaults.
  redis: {
    port: null,
    host: null
  }
};
