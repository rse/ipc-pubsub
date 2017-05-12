
/* eslint no-console: off */

const PubSub = require("..")

;(async () => {
    let pubsub = new PubSub("rpm+redis://x:local-secret@127.0.0.1:6379/test")
    await pubsub.open()
    await pubsub.subscribe("foo/#", (value, channel) => {
        console.log("GOT", value, channel)
    })
    await pubsub.publish("foo/bar", "bar")
    await pubsub.publish("foo/baz", "baz")
    await pubsub.close()
})()

