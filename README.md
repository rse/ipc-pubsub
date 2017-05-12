
IPC-PubSub
==========

Inter-Process-Communication (IPC) Publish-Subscribe (PubSub) Abstraction Layer

<p/>
<img src="https://nodei.co/npm/ipc-pubsub.png?downloads=true&stars=true" alt=""/>

<p/>
<img src="https://david-dm.org/rse/ipc-pubsub.png" alt=""/>

About
-----

This [Node.js](https://nodejs.org) module provides an abstraction layer
for Inter-Process-Communication through Publish-Subscribe. It
supports the following modes:

- Single-Process-Model (SPM):<br/>
  This is for Node applications NOT using the `cluster` module.
  The communication is performed with an in-memory `PatternEmitter`.
  No external resource is needed.

- Multi-Process-Model (MPM):<br/>
  This is for Node applications using the `cluster` module.
  The communication is performed with an in-memory `PatternEmitter`
  in each process and an IPC message exchange between the processes
  with the help of the `cluster` module. No external resource is needed.

- Remote-Process-Model (RPM):<br/>
  This is for Node applications split into distinct process, usually
  running also on distinct machines.
  The communication is performed with the help of an external broker.
  Currently an MQTT broker or the Redis PubSub is supported.

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

    /*  subscribe for message  */
    await pubsub.subscribe("foo/#", (value, channel) => {
        console.log(value, channel) // -> "quux" "foo/bar"
    })

    /*  publish message  */
    await pubsub.publish("foo/bar", "quux")

    /*  close connection  */
    await pubsub.close()
})
```

The following URLs are supported on `new PubSub(url)`:

- `spm`
- `mpm`
- `rpm+mqtt://[<username>:<password>@]<host>[:<port>][/<scope>]`
- `rpm+redis://[xxx:<secret>@]<host>[:<port>][/<scope>]`

The channel names are MQTT topic names, i.e., slash-separated strings
like `foo/bar/quux`. The channel argument of `subscribe(channel, ...)`
is actually an MQTT topic pattern, i.e., it can contain `*` for single
element and `#` for remaining elements. For example: `foo/bar/*/quux/#`
will match `foo/bar/baz/quux/foo`.

Application Programming Interface (API)
---------------------------------------

```ts
interface PubSubSubscription {
    unsubscribe(): Promise<void>;
}
declare class PubSub {
    constructor (url: string);
    open(): Promise<void>;
    publish(channel, message): Promise<void>;
    subscribe(channelPattern: string,
        onMessage: (message, channel) => void): Promise<PubSubSubscription>;
    close(): Promise<void>;
}
```

License
-------

Copyright (c) 2017 Ralf S. Engelschall (http://engelschall.com/)

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

