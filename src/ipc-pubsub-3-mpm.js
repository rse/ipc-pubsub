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

import cluster            from "cluster"
import PatternEmitter     from "pattern-emitter"
import { pattern2regexp } from "./ipc-pubsub-1-util"

const clusterWorkers = () => {
    let workers = []
    for (const id in cluster.workers)
        workers.push(cluster.workers[id])
    return workers
}

/*  Publish-Subscribe for Multi-Process-Model (MPM)  */
export default class PubSub {
    constructor (url) {
        this.url    = url
        this.id     = this.url.pathname
        this.opened = false
    }

    /*  open connection  */
    open () {
        if (this.opened)
            throw new Error("already opened")
        this.emitter = new PatternEmitter()
        this.messageHandler = (message) => {
            if (!(   typeof message === "object"
                  && typeof message.type === "string"))
                return
            if (message.type === `PubSub:mpm:${this.id}:master`)
                this._publishOnMaster(message.channel, message.value)
            else if (message.type === `PubSub:mpm:${this.id}:worker`)
                this._publishOnWorker(message.channel, message.value)
        }
        if (cluster.isMaster) {
            clusterWorkers().forEach((worker) => {
                worker.on("message", this.messageHandler)
            })
        }
        else
            process.on("message", this.messageHandler)
        this.opened = true
        return Promise.resolve()
    }

    /*  publish message to channel  */
    publish (channel, value) {
        if (!this.opened)
            throw new Error("still not opened")
        if (cluster.isMaster)
            return this._publishOnMaster(channel, value)
        else {
            return new Promise((resolve, reject) => {
                process.send({ type: `PubSub:mpm:${this.id}:master`, channel: channel, value: value }, (err) => {
                    if (err) reject(err)
                    else     resolve()
                })
            })
        }
    }
    _publishOnMaster (channel, value) {
        this.emitter.emit(channel, value)
        return Promise.all(clusterWorkers().map((worker) => {
            return new Promise((resolve, reject) => {
                worker.send({ type: `PubSub:mpm:${this.id}:worker`, channel: channel, value: value }, (err) => {
                    if (err) reject(err)
                    else     resolve()
                })
            })
        }))
    }
    _publishOnWorker (channel, value) {
        this.emitter.emit(channel, value)
        return Promise.resolve()
    }

    /*  subscribe to channel(s) for messages  */
    subscribe (channelPrefix, callback) {
        if (!this.opened)
            throw new Error("still not opened")
        let channelRegexp = new RegExp(`^${pattern2regexp(channelPrefix)}$`)
        const handler = function (message) {
            callback(message, this.event)
        }
        this.emitter.on(channelRegexp, handler)
        return Promise.resolve({
            unsubscribe: () => {
                this.emitter.removeListener(channelRegexp, handler)
                return Promise.resolve()
            }
        })
    }

    /*  close connection  */
    close () {
        if (!this.opened)
            throw new Error("still not opened")
        process.removeListener("message", this.messageHandler)
        delete this.messageHandler
        delete this.emitter
        this.opened = false
        return Promise.resolve()
    }
}

