/*
        …[  [ … [    [[∞]]    ] … ]  ]…
    # Backwater Systems ◦ `static-server.js`
    A fine HTTP(S) server for static content
    _powered by [`Koa`](https://koajs.com/)_
                      ---
  written by [Nate Gehringer](mailto:ngehringer@gmail.com)
                       ◦
  © 2020 [Backwater Systems](https://backwater.systems)
        …[  [ … [    [[∞]]    ] … ]  ]…

  **Usage:** `node static-server.js [${content_folder} = .] [${host_name} = localhost] [${port_number} = 8020] [${certificate_name} = localhost]`
*/


import fs from 'fs/promises';
import http from 'http';
import https from 'https';
import path from 'path';

import Koa from 'koa';
import koaConditionalGet from 'koa-conditional-get';
import koaEtag from 'koa-etag';
import koaStatic from 'koa-static';


/**
 * ANSI terminal control sequences
 */
const TERMINAL_CONTROL_SEQUENCES = Object.freeze({
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  DIM: '\x1b[2m',
  FOREGROUND_RED: '\x1b[31m',
  FOREGROUND_GREEN: '\x1b[32m',
  FOREGROUND_YELLOW: '\x1b[33m'
});

/**
 * Logs errors to the console.
 */
const logError = ({
  error,
  message = null
}) => {
  if ( !(error instanceof Error) ) throw new TypeError('error');

  const _message = (
    (typeof message === 'string')
    && (message !== '')
  )
    ? message
    : null
  ;

  console.error(`${TERMINAL_CONTROL_SEQUENCES.DIM}[${new Date().toISOString()}]${TERMINAL_CONTROL_SEQUENCES.RESET} ${TERMINAL_CONTROL_SEQUENCES.FOREGROUND_RED}[ERROR]${TERMINAL_CONTROL_SEQUENCES.RESET}${(_message === null) ? '' : ` ${message} —`} ${error.name}: ${error.message}${(ENVIRONMENT === 'development') ? `\n${error.stack}` : ''}`);
};

/**
 * Logs messages to the console.
 */
const logMessage = ({
  message
}) => {
  if (typeof message !== 'string') throw new TypeError('message');

  console.log(`${TERMINAL_CONTROL_SEQUENCES.DIM}[${new Date().toISOString()}]${TERMINAL_CONTROL_SEQUENCES.RESET} ${message}`);
};

/**
 * The environment hosting the server (via the `NODE_ENV` environment variable)
 *
 * @default 'development'
 */
const ENVIRONMENT = (
  (process.env.NODE_ENV === 'development')
  || (process.env.NODE_ENV === 'production')
)
  ? process.env.NODE_ENV
  : 'development'
;

/**
 * The absolute path of the current folder
 */
const CURRENT_FOLDER = process.cwd();

/**
 * The absolute path of the folder containing this module
 */
const MODULE_FOLDER = path.dirname( new URL(import.meta.url).pathname );

/**
 * The absolute path of the folder containing the content to serve
 */
const CONTENT_FOLDER = (typeof process.argv[2] === 'string')
  ? path.join(CURRENT_FOLDER, process.argv[2])
  : CURRENT_FOLDER
;

/**
 * The host name of the server
 *
 * @default 'localhost'
 */
const HOST_NAME = (typeof process.argv[3] === 'string')
  ? process.argv[3]
  : 'localhost'
;

/**
 * The port number of the server
 *
 * @default 8020
 */
const PORT_NUMBER = (typeof process.argv[4] === 'string')
  ? Number.parseInt(process.argv[4], 10)
  : 8020
;

/**
 * The prefix of the certificate file names
 *
 * E.g., …
 * - Private key: `localhost.key`
 * - Certificate signing request: `localhost.csr`
 * - Certificate: `localhost.crt`
 *
 * @default 'localhost'
 */
const CERTIFICATE_NAME = (typeof process.argv[5] === 'string')
  ? process.argv[5]
  : 'localhost'
;

/**
 * The absolute path of the private key file
 */
const privateKeyFilePath = path.join(CURRENT_FOLDER, `${CERTIFICATE_NAME}.key`);

/**
 * The absolute path of the certificate signing request file
 */
const certificateSigningRequestFilePath = path.join(CURRENT_FOLDER, `${CERTIFICATE_NAME}.csr`);

/**
 * The absolute path of the certificate file
 */
const certificateFilePath = path.join(CURRENT_FOLDER, `${CERTIFICATE_NAME}.crt`);

/**
 * The private key (required for HTTPS)
 */
let privateKey;

/**
 * The certificate signing request (required for HTTPS)
 */
let certificateSigningRequest;

/**
 * The certificate (required for HTTPS)
 */
let certificate;

// attempt to read the certificate files
try {
  [
    privateKey,
    certificateSigningRequest,
    certificate
  ] = await Promise.all([
    fs.readFile(
      privateKeyFilePath,
      {
        encoding: 'utf8'
      }
    ),
    fs.readFile(
      certificateSigningRequestFilePath,
      {
        encoding: 'utf8'
      }
    ),
    fs.readFile(
      certificateFilePath,
      {
        encoding: 'utf8'
      }
    ),
  ]);
}
catch (error) {
  // log the error
  logError({ error: error });

  privateKey = null;
  certificateSigningRequest = null;
  certificate = null;

  // rethrow the error if the `Error.code` value is _not_ `ENOENT` (“No such file or directory”)
  if (error.code !== 'ENOENT') throw error;
}

/**
 * Whether HTTPS is enabled
 */
const httpsEnabled = (
  (privateKey !== null)
  && (certificateSigningRequest !== null)
  && (certificate !== null)
);

/**
 * A `Map` of custom file name extension / media type specifications (used to set / override the `Content-Type` HTTP header)
 */
let fileNameExtensionMediaTypeMap;

// read the file name extension / media type specifications file
try {
  /**
   * JSON containing file name extension / media type mappings
   */
  const fileNameExtensionMediaTypeMapString = await fs.readFile(
    path.join(MODULE_FOLDER, 'file_name_extension_media_type_map.json'),
    {
      encoding: 'utf8'
    }
  );

  /**
   * Parsed JSON, nominally of the type `[ ${file_name_extension}: string, ${media_type}: string ][]`
   */
  const fileNameExtensionMediaTypeMapJSON = JSON.parse(fileNameExtensionMediaTypeMapString);

  // sanitize the input
  fileNameExtensionMediaTypeMap = new Map(
    (
      Array.isArray(fileNameExtensionMediaTypeMapJSON)
        ? fileNameExtensionMediaTypeMapJSON
        : []
    )
    .filter(
      (fileNameExtensionMediaType) => (
        Array.isArray(fileNameExtensionMediaType)
        && (typeof fileNameExtensionMediaType[0] === 'string')
        && (fileNameExtensionMediaType[0] !== '')
        && (typeof fileNameExtensionMediaType[1] === 'string')
        && (fileNameExtensionMediaType[1] !== '')
      )
    )
  );
}
catch (error) {
  // log the error
  logError({ error: error });

  fileNameExtensionMediaTypeMap = new Map();

  // consume the error
}

/**
 * The `Koa` server instance
 */
const app = new Koa();

// set the `Koa.env` property
app.env = ENVIRONMENT;

// log errors
app.on(
  'error',
  (err, ctx) => {
    logError({
      error: err,
      message: `${ctx.ip} ${ctx.method} ${ctx.url}`
    });
  }
);

// log access
app.use(
  async (ctx, next) => {
    await next();

    // [{ISO 8601 timestamp (UTC)}] {IP address} {HTTP response status code} {HTTP request method} {URL}
    // e.g., `[2021-01-01T00:00:00.000Z] ::1 200 GET /`
    logMessage({ message: `${ctx.ip} ${ctx.status} ${ctx.method} ${ctx.url}` });
  }
);

// append `/` and redirect (with a 302 “Found” HTTP status) on folder paths without a suffixed `/`
app.use(
  async (ctx, next) => {
    // if the requested path does not have an extension (i.e., does not include `.`) and does not end in `/`, test if it is a folder
    if (
      !ctx.path.includes('.')
      && !ctx.path.endsWith('/')
    ) {
      try {
        /**
         * File system information about the requested path
         */
        const stats = await fs.stat(`${CONTENT_FOLDER}${ctx.path}`);

        // if the path is a folder, redirect to the path with `/` appended
        if ( stats.isDirectory() ) {
          ctx.redirect(`${ctx.path}/`);
        }
      }
      catch (error) {
        // if the `Error.code` value is _not_ `ENOENT` (“No such file or directory”) …
        if (error.code !== 'ENOENT') {
          // … log the error
          logError({ error: error });
        }

        // … consume the error
      }
    }

    await next();
  }
);

// enable the 304 “Not Modified” HTTP status for GET requests
app.use( koaConditionalGet() );

// enable HTTP `ETag` support
app.use( koaEtag() );

// modify HTTP header: `Content-Type`
app.use(
  async (ctx, next) => {
    await next();

    // abort on index document requests (paths ending in `/`)
    if ( ctx.path.endsWith('/') ) return;

    /**
     * The file name extension of the requested path (or `null`, if it does not have one)
     */
    const fileNameExtension = ctx.path.includes('.')
      ? ctx.path.slice(ctx.path.lastIndexOf('.') + 1)
      : null
    ;

    // set the `Content-Type` HTTP header based on the requested path’s file name extension
    if (fileNameExtension === null) {
      ctx.type = 'text/plain';
    }
    else if ( fileNameExtensionMediaTypeMap.has(fileNameExtension) ) {
      ctx.type = fileNameExtensionMediaTypeMap.get(fileNameExtension);
    }
    else {
      ctx.type = fileNameExtension;
    }
  }
);

// serve the specified folder as static content
app.use( koaStatic(CONTENT_FOLDER) );

/**
 * The Node.js `https` or `http` `Server` instance underlying the `Koa` server instance
 */
const server = httpsEnabled
  ? https.createServer(
    {
      ca: certificateSigningRequest,
      cert: certificate,
      key: privateKey
    },
    app.callback()
  )
  : http.createServer( app.callback() )  
;

// start the server
server.listen(
  {
    exclusive: true,
    host: HOST_NAME,
    port: PORT_NUMBER
  },
  () => {
    logMessage({
      message: 
`${TERMINAL_CONTROL_SEQUENCES.BRIGHT}Backwater Systems${TERMINAL_CONTROL_SEQUENCES.RESET} ◦ ${TERMINAL_CONTROL_SEQUENCES.FOREGROUND_GREEN}static-server.js${TERMINAL_CONTROL_SEQUENCES.RESET} started.
\t${TERMINAL_CONTROL_SEQUENCES.FOREGROUND_YELLOW}▻${TERMINAL_CONTROL_SEQUENCES.RESET} listening on:\t\t${TERMINAL_CONTROL_SEQUENCES.BRIGHT}${httpsEnabled ? 'https' : 'http'}://${HOST_NAME}:${PORT_NUMBER}${TERMINAL_CONTROL_SEQUENCES.RESET}
\t${TERMINAL_CONTROL_SEQUENCES.FOREGROUND_YELLOW}▻${TERMINAL_CONTROL_SEQUENCES.RESET} serving content from:\t${TERMINAL_CONTROL_SEQUENCES.BRIGHT}${CONTENT_FOLDER}${TERMINAL_CONTROL_SEQUENCES.RESET}
\t${TERMINAL_CONTROL_SEQUENCES.FOREGROUND_YELLOW}▻${TERMINAL_CONTROL_SEQUENCES.RESET} environment:\t\t${TERMINAL_CONTROL_SEQUENCES.BRIGHT}${ENVIRONMENT}${TERMINAL_CONTROL_SEQUENCES.RESET}`
    });
  }
);