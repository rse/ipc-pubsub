/*
**  IPC-PubSub -- Inter-Process-Communication Publish-Subscribe
**  Copyright (c) 2017-2018 Ralf S. Engelschall <rse@engelschall.com>
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

import fs               from "fs"
import NATS             from "nats"
import { pattern2glob } from "./ipc-pubsub-1-util"

/*  Publish-Subscribe for Remote-Process-Model (RPM) with NATS Broker  */
export default class PubSub {
    constructor (url) {
        this.url = url
        this.opened = false
    }

    /*  open connection  */
    open () {
        if (this.opened)
            throw new Error("already opened")
        let config = {
            url: `nats://${this.url.hostname}:${this.url.port ? parseInt(this.url.port) : 4242}`
        }
        if (   this.url.query.tls !== undefined
            || this.url.query.ca  !== undefined
            || this.url.query.key !== undefined
            || this.url.query.crt !== undefined) {
            config.tls = { rejectUnauthorized: false }
            if (this.url.query.ca !== undefined) {
                config.tls.ca = fs.readFileSync(this.url.query.ca).toString()
                config.tls.rejectUnauthorized = true
            }
            if (this.url.query.key !== undefined)
                config.tls.key = fs.readFileSync(this.url.query.key).toString()
            if (this.url.query.crt !== undefined)
                config.tls.cert = fs.readFileSync(this.url.query.crt).toString()
        }
        if (this.url.auth) {
            config.user = this.url.auth.split(":")[0]
            config.pass = this.url.auth.split(":")[1]
        }
        if (this.url.pathname)
            this.scope = this.url.pathname.replace(/^\/([^/]+).*/, "$1") + "."
        else
            this.scope = ""
        this.client = NATS.connect(config)
        this.opened = true
        return Promise.resolve()
    }

    /*  publish message to channel  */
    publish (channel, value) {
        if (!this.opened)
            throw new Error("still not opened")
        channel = (this.scope + channel).replace(/\//g, ".")
        this.client.publish(channel, value)
        return Promise.resolve()
    }

    /*  subscribe to channel(s) for messages  */
    subscribe (channelPrefix, callback) {
        if (!this.opened)
            throw new Error("still not opened")
        let channelGlob = pattern2glob(this.scope + channelPrefix).replace(/\//g, ".")
        let ssid = this.client.subscribe(channelGlob, {}, (data, reply, channel) => {
            if (this.scope)
                channel = channel.replace(new RegExp(`^${this.scope}`), "")
            channel = channel.replace(/\./g, "/")
            callback(data, channel)
        })
        return Promise.resolve({
            unsubscribe: () => {
                this.client.unsubscribe(ssid)
                return Promise.resolve()
            }
        })
    }

    /*  close connection  */
    close () {
        if (!this.opened)
            throw new Error("still not opened")
        this.client.close()
        delete this.client
        this.opened = false
        return Promise.resolve()
    }
}

