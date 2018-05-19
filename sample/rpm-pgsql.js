
/* eslint no-console: off */

const PubSub = require("..")

;(async () => {
    let pubsub = new PubSub("rpm+pgsql://postgresql:postgresql@127.0.0.1:5432/template1")
    await pubsub.open()
    await pubsub.subscribe("foo-bar.quux", (value, channel) => {
        console.log("GOT", value, channel)
    })
    await pubsub.publish("foo-bar.quux", "bar")
    await pubsub.publish("foo-bar.quux", "baz")
    setTimeout(() => {
        pubsub.close()
    }, 1000)
})()

