import {LogLevel, getTagged, setDefaultLogLevel} from 'bp_logger';
import * as streamedian from 'streamedian/player.js';
import WebsocketTransport from 'streamedian/transport/websocket.js';
import RTSPClient from 'streamedian/client/rtsp/client.js';
import {isSafari} from "streamedian/core/util/browser.js";

setDefaultLogLevel(LogLevel.Debug);
getTagged("transport:ws").setLevel(LogLevel.Error);
getTagged("client:rtsp").setLevel(LogLevel.Error);

let wsTransport = {
    constructor: WebsocketTransport,
    options: {
      socket: "ws://127.0.0.1:1104"
    }
};

let p = new streamedian.WSPlayer('test_video', {
    // url: `${STREAM_UNIX}${STREAM_URL}`,
    // type: wsp.StreamType.RTSP,
    modules: [
        {
            client: RTSPClient,
            transport: wsTransport
        }
    ]
});
