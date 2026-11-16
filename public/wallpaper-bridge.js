// A classic, synchronous script: host events can arrive before React or its bundle loads.
// No DOM readiness event or module loader may delay installing these callbacks.
/** @typedef {import('../src/wallpaper/bridge').WallpaperEvent} WallpaperEvent */
;(function () {
  if (window.wallpaperBridge) return

  /** @type {WallpaperEvent[]} */
  var queue = []
  /** @type {((event: WallpaperEvent) => void) | null} */
  var consumer = null
  var draining = false

  function drain() {
    if (draining) return
    draining = true
    try {
      while (consumer && queue.length) {
        var event = queue.shift()
        if (event) consumer(event)
      }
    } finally {
      draining = false
    }
  }

  /** @param {WallpaperEvent} event */
  function send(event) {
    queue.push(event)
    drain()
  }

  window.wallpaperBridge = {
    connect: function (next) {
      if (consumer) throw new Error('Wallpaper bridge already has a consumer')
      consumer = next
      try {
        drain()
      } catch (error) {
        consumer = null
        throw error
      }
      return function () {
        if (consumer === next) consumer = null
      }
    }
  }

  window.wallpaperPropertyListener = {
    applyUserProperties: function (properties) {
      send({ type: 'user-properties', properties: properties })
    },
    applyGeneralProperties: function (properties) {
      send({ type: 'general-properties', properties: properties })
    },
    setPaused: function (paused) {
      send({ type: 'paused', paused: paused })
    },
    userDirectoryFilesAddedOrChanged: function (property, files) {
      send({ type: 'directory-changed', property: property, files: files.slice() })
    },
    userDirectoryFilesRemoved: function (property, files) {
      send({ type: 'directory-removed', property: property, files: files.slice() })
    }
  }
})()
