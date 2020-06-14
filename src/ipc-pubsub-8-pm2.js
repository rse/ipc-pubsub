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

import PatternEmitter     from "pattern-emitter"
import { pattern2regexp } from "./ipc-pubsub-1-util"
import pm2 from "pm2"

/*  Publish-Subscribe for Processes started with PM@ cluster option  */
export default class PubSub {
    constructor (url) {
        this.url    = url
        this.id     = this.url.pathname
        this.opened = false
        this._workersIds = []
    }

    /*  open connection  */
    open () {
        if (this.opened)
            throw new Error("already opened")
        this.emitter = new PatternEmitter()
        this.messageHandler = (message) => {
            message = message.data
            if (typeof message !== "object")
                return
            this.emitter.emit(message.channel, message.value)
        }
        process.on("message", this.messageHandler)

        return new Promise((resolve, reject) => {
            pm2.connect(() => {
                pm2.list((err, processes) => {
                    if (err) {
                        reject(err)
                    }
                    else {
                        for (const i in processes) {
                            if (processes[i].name === this.id) {
                                this._workersIds.push(processes[i].pm_id)
                            }
                        }
                        this.opened = true
                        resolve()
                    }
                    pm2.disconnect()
                })
            })
        })
    }

    /*  publish message to channel  */
    publish (channel, value) {
        if (!this.opened)
            throw new Error("still not opened")

        return Promise.all(this._workersIds.map((workersId) => {
            return new Promise((resolve, reject) => {
                pm2.sendDataToProcessId(workersId, {
                    data : { channel: channel, value: value },
                    topic: channel
                }, (err, res) => {
                    if (err) reject(err)
                    else     resolve()
                })
            })
        }))
    }

    /*  subscribe to channel(s) for messages  */
    subscribe (channelPrefix, callback) {
        if (!this.opened)
            throw new Error("still not opened")
        const channelRegexp = new RegExp(`^${pattern2regexp(channelPrefix)}$`)
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

