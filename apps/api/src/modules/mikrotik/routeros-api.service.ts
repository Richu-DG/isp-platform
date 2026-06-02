import { Injectable, Logger } from "@nestjs/common";
import * as net from "net";

export interface RouterOsOptions {
  host: string;
  port?: number;
  user: string;
  password: string;
  timeout?: number;
}

export interface RouterOsResponse {
  [key: string]: string;
}

@Injectable()
export class RouterOsApiService {
  private readonly logger = new Logger(RouterOsApiService.name);

  async execute(options: RouterOsOptions, commands: string[][]): Promise<RouterOsResponse[][]> {
    return new Promise((resolve, reject) => {
      const { host, port = 8728, user, password, timeout = 10000 } = options;
      const socket = new net.Socket();
      const results: RouterOsResponse[][] = [];
      let buffer = Buffer.alloc(0);
      let authenticated = false;
      let commandIndex = 0;
      let currentResult: RouterOsResponse[] = [];
      let currentItem: RouterOsResponse = {};

      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error("RouterOS API connection timeout"));
      }, timeout);

      socket.connect(port, host, () => {
        sendSentence(["/login", `=name=${user}`, `=password=${password}`]);
      });

      socket.on("data", (data: Buffer) => {
        buffer = Buffer.concat([buffer, data]);
        processBuffer();
      });

      socket.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });

      socket.on("close", () => {
        clearTimeout(timer);
        if (!authenticated) reject(new Error("Connection closed before auth"));
      });

      function processBuffer() {
        while (buffer.length > 0) {
          const { word, consumed } = readWord(buffer);
          if (consumed === 0) break;
          buffer = buffer.slice(consumed);

          if (word === "!done") {
            results.push([...currentResult]);
            currentResult = [];
            currentItem = {};

            if (!authenticated) {
              authenticated = true;
              if (commands.length > 0) {
                sendCommand(commands[commandIndex]);
              } else {
                socket.destroy();
                resolve(results);
              }
            } else {
              commandIndex++;
              if (commandIndex < commands.length) {
                sendCommand(commands[commandIndex]);
              } else {
                socket.destroy();
                clearTimeout(timer);
                resolve(results);
              }
            }
          } else if (word === "!re") {
            if (Object.keys(currentItem).length > 0) currentResult.push(currentItem);
            currentItem = {};
          } else if (word.startsWith("=")) {
            const [key, ...vals] = word.slice(1).split("=");
            currentItem[key] = vals.join("=");
          } else if (word === "!trap" || word.startsWith("!trap")) {
            clearTimeout(timer);
            socket.destroy();
            reject(new Error(`RouterOS API error: ${word}`));
          }
        }
      }

      function sendSentence(words: string[]) {
        let sentence = Buffer.alloc(0);
        for (const word of words) {
          sentence = Buffer.concat([sentence, encodeLength(word.length), Buffer.from(word)]);
        }
        sentence = Buffer.concat([sentence, Buffer.from([0])]);
        socket.write(sentence);
      }

      function sendCommand(words: string[]) {
        sendSentence(words);
      }

      function encodeLength(len: number): Buffer {
        if (len < 0x80) return Buffer.from([len]);
        if (len < 0x4000) return Buffer.from([(len >> 8) | 0x80, len & 0xff]);
        if (len < 0x200000) return Buffer.from([(len >> 16) | 0xc0, (len >> 8) & 0xff, len & 0xff]);
        return Buffer.from([(len >> 24) | 0xe0, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff]);
      }

      function readWord(buf: Buffer): { word: string; consumed: number } {
        if (buf.length === 0) return { word: "", consumed: 0 };
        let len = 0;
        let offset = 0;

        const b0 = buf[0];
        if (b0 < 0x80) { len = b0; offset = 1; }
        else if (b0 < 0xc0) {
          if (buf.length < 2) return { word: "", consumed: 0 };
          len = ((b0 & 0x3f) << 8) | buf[1]; offset = 2;
        } else if (b0 < 0xe0) {
          if (buf.length < 3) return { word: "", consumed: 0 };
          len = ((b0 & 0x1f) << 16) | (buf[1] << 8) | buf[2]; offset = 3;
        } else {
          if (buf.length < 4) return { word: "", consumed: 0 };
          len = ((b0 & 0x0f) << 24) | (buf[1] << 16) | (buf[2] << 8) | buf[3]; offset = 4;
        }

        if (buf.length < offset + len) return { word: "", consumed: 0 };
        return { word: buf.slice(offset, offset + len).toString("utf8"), consumed: offset + len };
      }
    });
  }
}
