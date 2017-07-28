const net = require('net');
const WebSocketServer = require('ws').Server;

class Proxy {
  constructor({ port }) {
    this.channelIndex = 0;
    this.channels = {};

    this.wss = new WebSocketServer({ port });
    this.wss.on('connection', this.onConnection.bind(this));
    console.log(`listening ${port}`);
  }

  onConnection(conn) {
    const { protocol } = conn;

    conn.on('error', (err) => {
      console.error(`conn error: ${err}`);
    });

    switch (protocol) {
      case 'control':
        conn.on('message', (data) => this.onControlMessage(conn, decodeWsp(data)));
        break;

      case 'data':
        conn.on('message', (data) => this.onDataMessage(conn, decodeWsp(data)));
        break;

      default:
        console.error(`could not handle protocol: ${protocol}`);
        break;
    }
  };

  onControlMessage(conn, msg) {
    console.log("---- Control Msg ------------- ", msg);
    switch (msg.msg) {
      case 'INIT':
        this.handleMessageInit(conn, msg);
        break;

      case 'WRAP':
        this.channels[conn.id].seq = msg.headers.seq;

        console.log(">>>>>>>>>>>>>>", msg.payload);
        conn.sock.write(msg.payload);
        break;

      default:
        console.error(`could not handle control msg: ${msg.msg}`);
        break;
    }
  };

  onDataMessage(conn, msg) {
    switch (msg.msg) {
      case 'JOIN':
        const id = msg.headers.channel;
        this.channels[id] = {};
        this.channels[id].dataConn = conn;

        var msg = encodeWsp({
          code: '200',
          msg: 'OK',
          headers: {
            seq: msg.headers.seq,
          },
        });
        conn.send(msg);

        break;

      default:
        console.error(`could not handle data msg: ${msg.msg}`);
        break;
    }
  };

  handleMessageInit(conn, msg) {
    const sock = net.connect({
      host: msg.headers.host,
      port: msg.headers.port,
    }, () => {
      let buf = null;
      let dstOffset = 0;

      const id = this.channelIndex++;
      sock.on('data', (data) => {
        const dataType = determineDataType(data);

        switch (dataType) {
          case 'control':
            console.log("<<<<<<<<<<<<<<", data.toString('utf8'));
            const res = encodeWsp({
              code: '200',
              msg: 'OK',
              headers: {
                seq: this.channels[id].seq,
              },
              payload: data,
            });
            conn.send(res);
            break;

          case 'data':
            let srcOffset = 0;

            while (srcOffset < data.length) {
              if (!buf) {
                const len = data.readUIntBE(srcOffset + 2, 2);
                buf = new Buffer(4 + len);
                dstOffset = 0;
              }

              if (buf.length - dstOffset <= data.length - srcOffset) {
                data.copy(buf, dstOffset, srcOffset, srcOffset + buf.length - dstOffset);
                this.channels[id].dataConn.send(buf);

                srcOffset += buf.length - dstOffset;
                buf = null;
              } else {
                data.copy(buf, dstOffset, srcOffset, data.length);
                dstOffset += data.length - srcOffset;
                srcOffset = data.length;
              }
            }

            this.channels[id].dataConn.send(data);
            break;
        }
      });

      conn.sock = sock;
      conn.id = id;

      const res = encodeWsp({
        code: '200',
        msg: 'OK',
        headers: {
          seq: msg.headers.seq,
          channel: id,
        },
      });
      conn.send(res);
    });
  };
}

function determineDataType(data) {
  const head = data.toString('utf8', 0, 5);
  if (head === 'RTSP/') {
    return 'control';
  } else {
    return 'data';
  }
}

function decodeWsp(data) {
  var payIdx = data.indexOf('\r\n\r\n');
  var lines = data.substr(0, payIdx).split('\r\n');
  var hdr = lines.shift().match(new RegExp('WSP/1.1\\s+(.+)'));
  if (hdr) {
    var res = {
      msg:  hdr[1],
      headers: {},
      payload: ''
    };
    while (lines.length) {
      var line = lines.shift();
      if (line) {
        var subD = line.split(':');
        res.headers[subD[0]] = subD[1].trim();
      } else {
        break;
      }
    }
    res.payload = data.substr(payIdx+4);
    return res;
  }
  return null;
}

function encodeWsp({ code, msg, headers, payload }) {
  var msg = "WSP/1.1 " + code + " " + msg + "\r\n";
  // msg += "seq:" + seq ;
  if(headers) {
    for (const key of Object.keys(headers)) {
      msg += `${key}: ${headers[key]}\r\n`;
    }
  }
  msg += "\r\n";

  if(payload)
    msg += payload;

  return msg;
}

new Proxy({ port: 1104 });
