/*
**  IPC-PubSub -- Inter-Process-Communication Publish-Subscribe
**  Copyright (c) 2017 Ralf S. Engelschall <rse@engelschall.com>
**
**  Permission is hereby granted, free of charge, to any person obtaining
**  a copy of this software and associated documentation files (the
**  "Software"), to deal in the Software without restriction, including
**  without limitation the rights to use, copy, modify, merge, publish,
**  distribute, sublicense, and/or sell copies of the Software, and to
**  permit persons to whom the Software is furnished to do so, subject to
**  the following conditions:
**
**  The above copyright notice and this permission notice shall be included
**  in all copies or substantial portions of the Software.
**
**  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
**  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
**  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
**  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
**  CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
**  TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
**  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import MQTT        from "mqtt"
import MqttTopics  from "mqtt-topics"
import Promise     from "bluebird"

/*  Publish-Subscribe for Remote-Process-Model (RPM) with MQTT Broker  */
export default class PubSub {
    constructor (url) {
        this.url    = url
        this.opened = false
    }

    /*  open connection  */
    open () {
        if (this.opened)
            throw new Error("already opened")
        return new Promise((resolve, reject) => {
            let url = `mqtt://${this.url.hostname}:${this.url.port ? this.url.port : 1883}`
            let options = {}
            if (this.url.auth) {
                options.username = this.url.auth.split(":")[0]
                options.password = this.url.auth.split(":")[1]
            }
            if (this.url.pathname)
                this.scope = this.url.pathname.replace(/^\/([^/]+).*/, "$1/")
            else
                this.scope = ""
            this.client = MQTT.connect(url, options)
            let handled = false
            this.client.on("connect", () => {
                if (handled)
                    return
                handled = true
                this.opened = true
                resolve()
            })
            this.client.on("error", (err) => {
                if (handled)
                    return
                handled = true
                reject(err)
            })
        })
    }

    /*  publish message to channel  */
    publish (channel, value) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.client.publish(this.scope + channel, JSON.stringify(value), { qos: 0 }, (err) => {
                if (err) reject(err)
                else     resolve()
            })
        })
    }

    /*  subscribe to channel(s) for messages  */
    subscribe (channelPrefix, callback) {
        if (!this.opened)
            throw new Error("still not opened")
        const handler = (topic, message) => {
            message = JSON.parse(message)
            if (MqttTopics.match(this.scope + channelPrefix, topic)) {
                topic = topic.replace(new RegExp(`^${this.scope}`), "")
                callback(message, topic)
            }
        }
        this.client.on("message", handler)
        this.client.subscribe(this.scope + channelPrefix, { qos: 0 })
        return Promise.resolve({
            unsubscribe () {
                this.client.removeListener("message", handler)
                return Promise.resolve()
            }
        })
    }

    /*  close connection  */
    close () {
        if (!this.opened)
            throw new Error("still not opened")
        this.client.end()
        delete this.client
        this.opened = false
        return Promise.resolve()
    }
}

