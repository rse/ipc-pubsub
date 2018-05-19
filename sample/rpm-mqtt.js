
/* eslint no-console: off */

const PubSub = require("..")

;(async () => {
    let pubsub = new PubSub("rpm+mqtt://example:example@127.0.0.1:1883/example")
    await pubsub.open()
    await pubsub.subscribe("foo/#", (value, channel) => {
        console.log("GOT", value, channel)
    })
    await pubsub.publish("foo/bar", "bar")
    await pubsub.publish("foo/baz", "baz")
    setTimeout(() => {
        pubsub.close()
    }, 1000)
})()

