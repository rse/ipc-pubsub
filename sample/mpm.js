
/* eslint no-console: off */

const PubSub  = require("..")
const cluster = require("cluster")

;(async () => {
    if (cluster.isMaster) {
        for (let i = 0; i < 2; i++)
            cluster.fork()
        cluster.on("exit", (worker, code, signal) => {
            console.log(`worker ${worker.process.pid} died`)
        })
    }

    let pubsub = new PubSub("mpm")
    await pubsub.open()
    await pubsub.subscribe("foo/#", (value, channel) => {
        console.log("RECEIVED", cluster.isMaster, process.pid, value, channel)
    })
    setTimeout(async () => {
        await pubsub.publish("foo/bar", "bar:" + process.pid)
        await pubsub.publish("foo/baz", "baz:" + process.pid)
    }, cluster.isMaster ? 2000 : 1000)
})()

