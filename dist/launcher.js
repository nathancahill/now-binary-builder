"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const execa_1 = __importDefault(require("execa"));
const wait_on_1 = __importDefault(require("wait-on"));
const http_1 = require("http");
function normalizeNowProxyEvent(event) {
    let bodyBuffer;
    const { method, path, headers, encoding, body } = JSON.parse(event.body);
    if (body) {
        if (encoding === 'base64') {
            bodyBuffer = Buffer.from(body, encoding);
        }
        else if (encoding === undefined) {
            bodyBuffer = Buffer.from(body);
        }
        else {
            throw new Error(`Unsupported encoding: ${encoding}`);
        }
    }
    else {
        bodyBuffer = Buffer.alloc(0);
    }
    return { isApiGateway: false, method, path, headers, body: bodyBuffer };
}
function normalizeAPIGatewayProxyEvent(event) {
    let bodyBuffer;
    const { httpMethod: method, path, headers, body } = event;
    if (body) {
        if (event.isBase64Encoded) {
            bodyBuffer = Buffer.from(body, 'base64');
        }
        else {
            bodyBuffer = Buffer.from(body);
        }
    }
    else {
        bodyBuffer = Buffer.alloc(0);
    }
    return { isApiGateway: true, method, path, headers, body: bodyBuffer };
}
function normalizeEvent(event) {
    if ('Action' in event) {
        if (event.Action === 'Invoke') {
            return normalizeNowProxyEvent(event);
        }
        else {
            throw new Error(`Unexpected event.Action: ${event.Action}`);
        }
    }
    else {
        return normalizeAPIGatewayProxyEvent(event);
    }
}
const BINARY = '__NOW_BINARY';
const PORT = '__NOW_PORT';
async function launcher(event, context) {
    context.callbackWaitsForEmptyEventLoop = false;
    const { isApiGateway, method, path, headers, body } = normalizeEvent(event);
    const opts = {
        hostname: '127.0.0.1',
        port: PORT,
        path,
        method,
        headers,
    };
    const subprocess = execa_1.default(BINARY);
    await wait_on_1.default({
        resources: [`tcp:127.0.0.1:${PORT}`],
        interval: 20,
    });
    // eslint-disable-next-line consistent-return
    return new Promise((resolve, reject) => {
        const req = http_1.request(opts, res => {
            const response = res;
            const respBodyChunks = [];
            response.on('data', chunk => respBodyChunks.push(Buffer.from(chunk)));
            response.on('error', reject);
            response.on('end', () => {
                subprocess.kill();
                const bodyBuffer = Buffer.concat(respBodyChunks);
                delete response.headers.connection;
                if (isApiGateway) {
                    delete response.headers['content-length'];
                }
                else if (response.headers['content-length']) {
                    response.headers['content-length'] = String(bodyBuffer.length);
                }
                resolve({
                    statusCode: response.statusCode || 200,
                    headers: response.headers,
                    body: bodyBuffer.toString('base64'),
                    encoding: 'base64',
                });
            });
        });
        req.on('error', error => {
            setTimeout(() => {
                subprocess.kill();
                // this lets express print the true error of why the connection was closed.
                // it is probably 'Cannot set headers after they are sent to the client'
                reject(error);
            }, 2);
        });
        if (body)
            req.write(body);
        req.end();
    });
}
exports.launcher = launcher;
