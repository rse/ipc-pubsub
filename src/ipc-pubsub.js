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

import URL            from "url"

import PubSubSPM      from "./ipc-pubsub-2-spm"
import PubSubMPM      from "./ipc-pubsub-3-mpm"
import PubSubRPMmqtt  from "./ipc-pubsub-4-rpm-mqtt"
import PubSubRPMredis from "./ipc-pubsub-5-rpm-redis"
import PubSubRPMnats  from "./ipc-pubsub-6-rpm-nats"
import PubSubRPMpgsql from "./ipc-pubsub-7-rpm-pgsql"

/*  Publish-Subscribe API  */
class PubSub {
    constructor (url) {
        let m
        let urlParsed = URL.parse(url)
        if (url === "spm")
            this.strategy = new PubSubSPM(urlParsed)
        else if (urlParsed.protocol === "mpm:")
            this.strategy = new PubSubMPM(urlParsed)
        else if (typeof urlParsed.protocol === "string" && (m = urlParsed.protocol.match(/^rpm(?:\+([a-z]+))?:$/)) !== null) {
            if (m[1] === "mqtt")
                this.strategy = new PubSubRPMmqtt(urlParsed)
            else if (m[1] === "redis")
                this.strategy = new PubSubRPMredis(urlParsed)
            else if (m[1] === "nats")
                this.strategy = new PubSubRPMnats(urlParsed)
            else if (m[1] === "pgsql")
                this.strategy = new PubSubRPMpgsql(urlParsed)
            else
                throw new Error(`unknown implementation strategy "${url}"`)
        }
        else
            throw new Error(`unknown implementation strategy "${url}"`)
    }
    open      (...args) { return this.strategy.open(...args) }
    publish   (...args) { return this.strategy.publish(...args) }
    subscribe (...args) { return this.strategy.subscribe(...args) }
    close     (...args) { return this.strategy.close(...args) }
}

module.exports = PubSub

