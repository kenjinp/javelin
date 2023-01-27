import {app, Entity, Group, type} from "@javelin/ecs"
import {
  awareness,
  Client,
  interest,
  serverPlugin,
  WebsocketTransport,
} from "@javelin/net"
import {createServer} from "http"
import {WebSocket, WebSocketServer} from "ws"
import {Transform} from "./transform.js"

let httpServer = createServer()

let websocketServer = new WebSocketServer({server: httpServer})
let openedWebsocketQueue: WebSocket[] = []
let closedClientQueue: Entity[] = []

let game = app()
  .addSystemToGroup(Group.Init, world => {
    world.create(type(Transform))
  })
  .addSystemToGroup(Group.Early, world => {
    let socket: WebSocket | undefined
    while ((socket = openedWebsocketQueue.pop())) {
      if (socket.readyState !== socket.OPEN) {
        continue
      }
      let clientTransport = new WebsocketTransport(socket as any)
      let transformInterest = interest(0 as any, type(Transform))
      let clientAwareness = awareness().addInterest(transformInterest)
      let client = world.create(Client, clientTransport, clientAwareness)
      // @ts-ignore
      transformInterest.entity = client
      socket.on("close", () => {
        closedClientQueue.push(client)
      })
    }
    let client: Entity | undefined
    while ((client = closedClientQueue.pop()) !== undefined) {
      world.delete(client)
    }
  })
  .use(serverPlugin)

websocketServer.on("connection", socket => {
  openedWebsocketQueue.push(socket)
})

httpServer.listen(8080)

console.log(`
call of
  .::::::.   ::   .:      ...         ...     ::::::::::::.-:.     ::-.
 ;;;\`    \`  ,;;   ;;,  .;;;;;;;.   .;;;;;;;.  ;;;;;;;;'''' ';;.   ;;;;'
  '[==/[[[[,,[[[,,,[[[ ,[[     \[[,,[[     \[[,     [[        '[[,[[['
  '''    $"$$$"""$$$ $$$,     $$$$$$,     $$$     $$          c$$"
 88b    dP 888   "88o"888,_ _,88P"888,_ _,88P     88,       ,8P"\`
  "YMmMY"  MMM    YMM  "YMMMMMP"   "YMMMMMP"      MMM      mM"
`)

console.log("server listening on port 8080")

setInterval(() => {
  game.step()
}, 1000 / 60)
