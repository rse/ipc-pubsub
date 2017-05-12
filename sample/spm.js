
/* eslint no-console: off */

const PubSub = require("..")

;(async () => {
    let pubsub = new PubSub("spm")
    await pubsub.open()
    await pubsub.subscribe("foo/#", (value, channel) => {
        console.log(value, channel)
    })
    await pubsub.publish("foo/bar", "foo bar quux")
    await pubsub.close()
})()

