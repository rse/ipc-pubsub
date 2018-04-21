
IPC-PubSub
==========

Inter-Process-Communication (IPC) Publish-Subscribe (PubSub) Communication Abstraction Layer

<p/>
<img src="https://nodei.co/npm/ipc-pubsub.png?downloads=true&stars=true" alt=""/>

<p/>
<img src="https://david-dm.org/rse/ipc-pubsub.png" alt=""/>

About
-----

This [Node.js](https://nodejs.org) module provides an
abstraction layer for [Inter-Process-Communication
(IPC)](https://en.wikipedia.org/wiki/Inter-process_communication)
through Publish-Subscribe communication. It supports the following modes
(in order of increasing process scope and overall complexity):

- **Single-Process-Model (SPM):**<br/>
  This is for Node applications NOT using the Node.js
  [`cluster`](https://nodejs.org/api/cluster.html) module.
  The communication is performed with an in-memory
  [`PatternEmitter`](http://npmjs.com/pattern-emitter). No external
  resource is needed.

- **Multi-Process-Model (MPM):**<br/>
  This is for Node applications using the Node.js
  [`cluster`](https://nodejs.org/api/cluster.html) module. Hence, it is
  for Node applications split into distinct (related) processes, running
  on the same machine. The communication is performed with an in-memory
  [`PatternEmitter`](http://npmjs.com/pattern-emitter) in each process
  and an IPC message exchange between the processes with the help of the
  Node.js [`cluster`](https://nodejs.org/api/cluster.html) module. No
  external resource is needed.

- **Remote-Process-Model (RPM):**<br/>
  This is for Node applications split into (unrelated)
  distinct processes, usually running on distinct machines.
  The communication is performed with the help of an
  external broker. Currently a [NATS](https://nats.io/)
  broker (e.g. [gNATSd](https://github.com/nats-io/gnatsd)),
  a [MQTT](http://mqtt.org/) broker (e.g.
  [Mosquitto](https://mosquitto.org/)) or a [Redis](https://redis.io/)
  [Pub/Sub](https://redis.io/topics/pubsub) is supported.

Installation
------------

```shell
$ npm install ipc-pubsub --save-dev
```

Usage
-----

```js
(async () => {
    const PubSub = require("ipc-pubsub")

    /*  open connection  */
    let pubsub = new PubSub("spm")
    await pubsub.open()

    /*  subscribe for messages  */
    await pubsub.subscribe("foo/#", (value, channel) => {
        console.log(value, channel) // -> "quux" "foo/bar"
    })

    /*  publish message  */
    await pubsub.publish("foo/bar", "quux")

    /*  close connection  */
    await pubsub.close()
})()
```

The following URLs are supported on `new PubSub(url)`:

- `spm`
- `mpm:<scope>`
- `rpm+redis://[xxx:<secret>@]<host>[:<port>][/<scope>]`
- `rpm+mqtt://[<username>:<password>@]<host>[:<port>][/<scope>]`
- `rpm+nats://[<username>:<password>@]<host>[:<port>][/<scope>]`

The channel names are MQTT-style topic names, i.e., slash-separated strings
like `foo/bar/quux`. The channel argument of `subscribe(channel, ...)`
is actually an MQTT-style topic pattern, i.e., it can contain `*` for single
element and `#` for remaining elements. For example: `foo/bar/*/quux/#`
will match `foo/bar/baz/quux/foo`.

Application Programming Interface (API)
---------------------------------------

```ts
interface PubSubSubscription {
    unsubscribe(): Promise<void>;
}

declare class PubSub {
    constructor(url: string);

    open(): Promise<void>;

    publish(
        channel: string,
        message: any
    ): Promise<void>;

    subscribe(
        channelPattern: string,
        onMessage: (message: any, channel: string) => void
    ): Promise<PubSubSubscription>;

    close(): Promise<void>;
}
```

License
-------

Copyright (c) 2017-2018 Ralf S. Engelschall (http://engelschall.com/)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

