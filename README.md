# df-pubsub-test

Minimal reproduction for https://github.com/dragonflydb/dragonfly/issues/5139

- Main thread creates a client which subscribes and periodically unsubscribes/disconnects.
- Worker thread publishes continuously on the channel.
- The following [error](https://github.com/redis/ioredis/blob/40ae7ee6348a833b6dbb55187e352bd3eca13255/lib/DataHandler.ts#L234-L250) from the `ioredis` client library is triggered fairly consistently, within a minute or so of startup.
- This does not occur with the `redis:8` image

```
$ docker compose up

[...]

app-1    | Error: Command queue state error. If you can reproduce this, please report it. Last reply: message,test-channel,message-1748543127868
app-1    |     at DataHandler.shiftCommand (/app/node_modules/ioredis/built/DataHandler.js:176:27)
app-1    |     at DataHandler.returnReply (/app/node_modules/ioredis/built/DataHandler.js:53:27)
app-1    |     at JavascriptRedisParser.returnReply (/app/node_modules/ioredis/built/DataHandler.js:21:22)
app-1    |     at JavascriptRedisParser.execute (/app/node_modules/redis-parser/lib/parser.js:544:14)
app-1    |     at Socket.<anonymous> (/app/node_modules/ioredis/built/DataHandler.js:26:20)
app-1    |     at Socket.emit (node:events:524:28)
app-1    |     at Readable.read (node:internal/streams/readable:782:10)
app-1    |     at Socket.read (node:net:777:39)
app-1    |     at flow (node:internal/streams/readable:1283:53)
app-1    |     at emitReadable_ (node:internal/streams/readable:847:3)
app-1    | Emitted 'error' event at:
app-1    |     at DataHandler.shiftCommand (/app/node_modules/ioredis/built/DataHandler.js:180:24)
app-1    |     at DataHandler.returnReply (/app/node_modules/ioredis/built/DataHandler.js:53:27)
app-1    |     [... lines matching original stack trace ...]
app-1    |     at emitReadable_ (node:internal/streams/readable:847:3)
```
