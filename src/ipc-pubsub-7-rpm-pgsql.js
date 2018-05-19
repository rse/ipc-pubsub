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

import fs       from "fs"
import PgPubSub from "pg-pubsub"

/*  Publish-Subscribe for Remote-Process-Model (RPM) with PostgreSQL LISTEN/NOTIFY  */
export default class PubSub {
    constructor (url) {
        this.url = url
        this.opened = false
        if (this.url.pathname)
            this.database = this.url.pathname.replace(/^\//, "")
        else
            throw new Error("require path in URL")
    }

    /*  open connection  */
    open () {
        if (this.opened)
            throw new Error("already opened")
        let config = {
            database: this.database,
            host: this.url.hostname,
            port: this.url.port ? parseInt(this.url.port) : 5432
        }
        if (this.url.auth) {
            config.user     = this.url.auth.split(":")[0]
            config.password = this.url.auth.split(":")[1]
        }
        if (   this.url.query.tls !== undefined
            || this.url.query.ca  !== undefined
            || this.url.query.key !== undefined
            || this.url.query.crt !== undefined) {
            config.ssl = { rejectUnauthorized: false }
            if (this.url.query.ca !== undefined) {
                config.ssl.ca = fs.readFileSync(this.url.query.ca).toString()
                config.ssl.rejectUnauthorized = true
            }
            if (this.url.query.key !== undefined)
                config.ssl.key = fs.readFileSync(this.url.query.key).toString()
            if (this.url.query.crt !== undefined)
                config.ssl.cert = fs.readFileSync(this.url.query.crt).toString()
        }
        this.client = new PgPubSub(config, {
            log: (msg) => {}
        })
        return this.client.retry.try().then(() => {
            this.opened = true
        })
    }

    /*  publish message to channel  */
    publish (channel, value) {
        if (!this.opened)
            throw new Error("still not opened")
        channel = channel.replace(/\//g, "-")
        return this.client.publish(channel, value)
    }

    /*  subscribe to channel(s) for messages  */
    subscribe (channelPrefix, callback) {
        if (!this.opened)
            throw new Error("still not opened")
        if (channelPrefix.match(/[+#]/))
            throw new Error("PostgreSQL LISTEN/NOTIFY mechanism does not support wildcard channels")
        let channel = channelPrefix.replace(/\//g, "-")
        const handler = (data) => { callback(data, channelPrefix) }
        this.client.addChannel(channel, handler)
        return Promise.resolve({
            unsubscribe: () => {
                this.client.removeChannel(channel, handler)
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

