import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import execa from 'execa';
import waitOn from 'wait-on';
import {
  IncomingHttpHeaders,
  OutgoingHttpHeaders,
  request,
} from 'http';

interface NowProxyEvent {
  Action: string;
  body: string;
}

export interface NowProxyRequest {
  isApiGateway?: boolean;
  method: string;
  path: string;
  headers: IncomingHttpHeaders;
  body: Buffer;
}

export interface NowProxyResponse {
  statusCode: number;
  headers: OutgoingHttpHeaders;
  body: string;
  encoding: string;
}

function normalizeNowProxyEvent(event: NowProxyEvent): NowProxyRequest {
  let bodyBuffer: Buffer | null;
  const { method, path, headers, encoding, body } = JSON.parse(event.body);

  if (body) {
    if (encoding === 'base64') {
      bodyBuffer = Buffer.from(body, encoding);
    } else if (encoding === undefined) {
      bodyBuffer = Buffer.from(body);
    } else {
      throw new Error(`Unsupported encoding: ${encoding}`);
    }
  } else {
    bodyBuffer = Buffer.alloc(0);
  }

  return { isApiGateway: false, method, path, headers, body: bodyBuffer };
}

function normalizeAPIGatewayProxyEvent(
  event: APIGatewayProxyEvent
): NowProxyRequest {
  let bodyBuffer: Buffer | null;
  const { httpMethod: method, path, headers, body } = event;

  if (body) {
    if (event.isBase64Encoded) {
      bodyBuffer = Buffer.from(body, 'base64');
    } else {
      bodyBuffer = Buffer.from(body);
    }
  } else {
    bodyBuffer = Buffer.alloc(0);
  }

  return { isApiGateway: true, method, path, headers, body: bodyBuffer };
}

function normalizeEvent(
  event: NowProxyEvent | APIGatewayProxyEvent
): NowProxyRequest {
  if ('Action' in event) {
    if (event.Action === 'Invoke') {
      return normalizeNowProxyEvent(event);
    } else {
      throw new Error(`Unexpected event.Action: ${event.Action}`);
    }
  } else {
    return normalizeAPIGatewayProxyEvent(event);
  }
}

const BINARY = '__NOW_BINARY';
const PORT = '__NOW_PORT';

export async function launcher(
  event: NowProxyEvent | APIGatewayProxyEvent,
  context: Context
): Promise<NowProxyResponse> {
  context.callbackWaitsForEmptyEventLoop = false;
  const { isApiGateway, method, path, headers, body } = normalizeEvent(event);

  const opts = {
    hostname: '127.0.0.1',
    PORT,
    path,
    method,
    headers,
  };

  const subprocess = execa(BINARY)

  await waitOn({
    resources: [`tcp:127.0.0.1:${PORT}`],
    interval: 20,
  })

  // eslint-disable-next-line consistent-return
  return new Promise((resolve, reject) => {
    const req = request(opts, res => {
      const response = res;
      const respBodyChunks: Buffer[] = [];
      response.on('data', chunk => respBodyChunks.push(Buffer.from(chunk)));
      response.on('error', reject);
      response.on('end', () => {
        subprocess.kill();
        const bodyBuffer = Buffer.concat(respBodyChunks);
        delete response.headers.connection;

        if (isApiGateway) {
          delete response.headers['content-length'];
        } else if (response.headers['content-length']) {
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

    if (body) req.write(body);
    req.end();
  });
}
