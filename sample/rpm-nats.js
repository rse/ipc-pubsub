
/* eslint no-console: off */

const PubSub = require("..")

;(async () => {
    let pubsub = new PubSub("rpm+nats://example:example@127.0.0.1:4242/example?tls")
    await pubsub.open()
    await pubsub.subscribe("foo/#", (value, channel) => {
        console.log("GOT", value, channel)
    })
    await pubsub.publish("foo/bar", "bar")
    await pubsub.publish("foo/baz", "baz")
    setTimeout(async () => {
        await pubsub.close()
    }, 1000)
})()

