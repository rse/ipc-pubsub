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

import NodeRedisPubsub    from "node-redis-pubsub"
import { pattern2glob }   from "./ipc-pubsub-1-util"

/*  Publish-Subscribe for Remote-Process-Model (RPM) with REDIS Broker  */
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
            host: this.url.hostname,
            port: this.url.port ? parseInt(this.url.port) : 6379
        }
        if (this.url.password)
            config.auth = this.url.password
        if (this.url.pathname)
            config.scope = this.url.pathname.replace(/^\/([^/]+).*/, "$1")
        this.scope = config.scope
        this.client = new NodeRedisPubsub(config)
        this.opened = true
        return Promise.resolve()
    }

    /*  publish message to channel  */
    publish (channel, value) {
        if (!this.opened)
            throw new Error("still not opened")
        this.client.emit(channel, value)
        return Promise.resolve()
    }

    /*  subscribe to channel(s) for messages  */
    subscribe (channelPrefix, callback) {
        if (!this.opened)
            throw new Error("still not opened")
        let channelGlob = pattern2glob(channelPrefix)
        return new Promise((resolve, reject) => {
            let unsubscribe = this.client.on(channelGlob, (data, channel) => {
                if (this.scope)
                    channel = channel.replace(new RegExp(`^${this.scope}:`), "")
                callback(data, channel)
            }, (err) => {
                if (err)
                    reject(err)
                else {
                    resolve({
                        unsubscribe: () => {
                            return new Promise((resolve, reject) => {
                                unsubscribe((err) => {
                                    if (err) reject(err)
                                    else     resolve()
                                })
                            })
                        }
                    })
                }
            })
        })
    }

    /*  close connection  */
    close () {
        if (!this.opened)
            throw new Error("still not opened")
        this.client.quit()
        delete this.client
        this.opened = false
        return Promise.resolve()
    }
}

