'use strict';

import WebSocket from 'ws';
import { createClient } from 'redis'
import express from 'express';
import next from 'next';

const redisPort: number = parseInt(process.env.REDIS_PORT as string) || 6379,
    redisHost = process.env.REDIS_HOST || 'localhost',
    WebSocketServer = WebSocket.Server,
    streamName = process.env.STREAM || 'inspection',
    STREAMS_KEY = "predictions";
const port = process.env.PORT || 5000;


async function createServer() {
    try {
        const readStream = function (ws: any) {
            try {
                const app = express();
                app.use(express.json());

                const nextApp = next({
                    dev: process.env.NODE_ENV !== 'production',
                    dir: __dirname
                });

                const handle = nextApp.getRequestHandler();

                nextApp.prepare();

                app.get('*', (req:any, res:any) => handle(req, res));

                app.listen({ port }, () => {
                    console.log(
                        `🚀 Server ready at http://localhost:5000`
                    );
                });

                const rc: any = createClient({ port: redisPort, host: redisHost });
                if (!rc.connected) {
                    console.log('redis not connected!');
                }
                else {
                    console.log('redis connected!');
                }
                const xreadStream = (endId: string) => rc.xread('Block', 120000, 'STREAMS', STREAMS_KEY, endId, function (err: any, stream: any) {
                    if (err) {
                        return console.error(err);
                    }

                    let lastId = '$'
                    if (stream) {
                        const streamLength = stream[0][1].length;
                        lastId = stream[0][1][streamLength - 1][0];
                        const data = stream[0][1][0][1];
                        const finalData: any = {};
                        for (let i = 0; i <= data.length; i += 2) {
                            finalData[data[i]] = data[i + 1];
                        }
                        finalData.water = '0';
                        console.log(finalData);
                        ws.send(JSON.stringify(finalData));
                        xreadStream(lastId);
                    }
                });
                xreadStream('$');
            } catch (e: any) {
                console.log(e);
            }
        }

        function startInspection(inspectionId: string, ws: any) {
            const rc: any = createClient({ port: redisPort, host: redisHost });
            rc.xadd(`${streamName}`, '*',
                'inspectionId', inspectionId,
                function (err: any,) {
                    if (err) { console.log(err) };
                    readStream(ws);
                });
        }

        const wss = new WebSocketServer({ port: 3625 });
        wss.on("error", (err: any) => {
            console.log("Caught flash policy server socket error: ")
            console.log(err.stack)
        });

        wss.on('connection', function (ws: any) {
            ws.on('message', function (message: string) {
                console.log(`web socket connection message : ${message}`);
                if (message.indexOf('inspection|') === 0) {
                    startInspection((message.replace('inspection|', '')), ws);
                }
            });
        });
    } catch (err) {
        console.log(err);
    }
}

createServer()