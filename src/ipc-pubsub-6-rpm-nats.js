/*
**  IPC-PubSub -- Inter-Process-Communication Publish-Subscribe
**  Copyright (c) 2017-2019 Dr. Ralf S. Engelschall <rse@engelschall.com>
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
        const config = {
            url: `nats://${this.url.hostname}:${this.url.port ? parseInt(this.url.port) : 4242}`
        }
        if (   this.url.searchParams !== undefined
            && (   this.url.searchParams.get("tls")
                || this.url.searchParams.get("ca")
                || this.url.searchParams.get("key")
                || this.url.searchParams.get("crt"))) {
            config.tls = { rejectUnauthorized: false }
            if (this.url.searchParams.get("ca")) {
                config.tls.ca = fs.readFileSync(this.url.searchParams.get("ca")).toString()
                config.tls.rejectUnauthorized = true
            }
            if (this.url.searchParams.get("key"))
                config.tls.key = fs.readFileSync(this.url.searchParams.get("key")).toString()
            if (this.url.searchParams.get("crt"))
                config.tls.cert = fs.readFileSync(this.url.searchParams.get("crt")).toString()
        }
        if (this.url.username)
            config.user = this.url.username
        if (this.url.password)
            config.pass = this.url.password
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
        const channelGlob = pattern2glob(this.scope + channelPrefix).replace(/\//g, ".")
        const ssid = this.client.subscribe(channelGlob, {}, (data, reply, channel) => {
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

