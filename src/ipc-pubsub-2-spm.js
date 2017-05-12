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

import PatternEmitter     from "pattern-emitter"
import { pattern2regexp } from "./ipc-pubsub-1-util"

/*  Publish-Subscribe for Single-Process-Model (SPM)  */
export default class PubSub {
    constructor (/* url */) {
        this.opened = false
    }

    /*  open connection  */
    open () {
        if (this.opened)
            throw new Error("already opened")
        this.emitter = new PatternEmitter()
        this.opened = true
        return Promise.resolve()
    }

    /*  publish message to channel  */
    publish (channel, value) {
        if (!this.opened)
            throw new Error("still not opened")
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
            unsubscribe () {
                this.emitter.removeListener(channelRegexp, handler)
                return Promise.resolve()
            }
        })
    }

    /*  close connection  */
    close () {
        if (!this.opened)
            throw new Error("still not opened")
        delete this.emitter
        this.opened = false
        return Promise.resolve()
    }
}

