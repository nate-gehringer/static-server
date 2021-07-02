#!/usr/bin/env node
/*
        …[  [ … [    [[∞]]    ] … ]  ]…
    # Backwater Systems ◦ `static-server.js`
    A fine HTTP(S) server for static content
    _Powered by [`Koa`](https://koajs.com/)_
                      ---
  © 2020 – 2021 [Nate Gehringer](mailto:ngehringer@gmail.com)
                       ◦
  [Backwater Systems](https://backwater.systems/)
        …[  [ … [    [[∞]]    ] … ]  ]…

  **Usage:** `[NODE_ENV=development] ./static-server.js . `# [root_folder]` localhost `# [host_name]` 8020 `# [port_number]` localhost `# [certificate_name]`
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
 * The `logging` namespace
 */
const logging = Object.freeze({
  /**
   * ANSI terminal control sequences
   */
  TERMINAL_CONTROL_SEQUENCES: Object.freeze({
    RESET: '\x1b[0m',
    BRIGHT: '\x1b[1m',
    DIM: '\x1b[2m',
    FOREGROUND_RED: '\x1b[31m',
    FOREGROUND_GREEN: '\x1b[32m',
    FOREGROUND_YELLOW: '\x1b[33m'
  }),

  /**
   * Logs errors to the console.
   */
  logError: ({
    error,
    message = null
  }) => {
    if ( !(error instanceof Error) ) throw new TypeError('error');

    /**
     * The custom error message (or `null`)
     *
     * @default null
     */
    const _message = (
      (typeof message === 'string')
      && (message !== '')
    )
      ? message
      : null
    ;

    console.error(`${logging._generateTimestamp()} ${logging.TERMINAL_CONTROL_SEQUENCES.FOREGROUND_RED}[ERROR]${logging.TERMINAL_CONTROL_SEQUENCES.RESET}${(_message === null) ? '' : ` ${message} —`} ${error.name}: ${error.message}${(configuration.ENVIRONMENT === 'development') ? `\n${error.stack}` : ''}`);
  },

  /**
   * Logs information to the console.
   */
  logInformation: ({
    message
  }) => {
    if (typeof message !== 'string') throw new TypeError('message');

    console.log(`${logging._generateTimestamp()} ${message}`);
  },

  _generateTimestamp: () => `${logging.TERMINAL_CONTROL_SEQUENCES.DIM}[${new Date().toISOString()}]${logging.TERMINAL_CONTROL_SEQUENCES.RESET}`
});

/**
 * The `utilities` namespace
 */
const utilities = Object.freeze({
  /**
   * Returns the server’s configuration.
   *
   * Settings in the configuration file are overriden by command-line arguments, if specified.
   */
  getConfiguration: async () => {
    /**
     * The server’s configuration as specified in the command-line arguments
     */
    const configurationFromCommandLineArguments = await utilities.readConfigurationFromCommandLineArguments();

    /**
     * The server’s configuration as specified in the `configuration.json` file
     */
    const configurationFromFile = await utilities.readConfigurationFromFile();

    return {
      /**
       * The prefix of the certificate file names
       *
       * I.e., …
       * - Private key: `${CERTIFICATE_NAME}.key`
       * - Certificate signing request: `${CERTIFICATE_NAME}.csr`
       * - Certificate: `${CERTIFICATE_NAME}.crt`
       *
       * @default 'localhost'
       */
      CERTIFICATE_NAME: (
        configurationFromCommandLineArguments.CERTIFICATE_NAME
        ?? configurationFromFile?.CERTIFICATE_NAME
        ?? DEFAULTS.CERTIFICATE_NAME
      ),

      /**
       * The environment hosting the server (via the `NODE_ENV` environment variable)
       *
       * @default 'development'
       */
      ENVIRONMENT: (
        (process.env.NODE_ENV === 'development')
        || (process.env.NODE_ENV === 'production')
      )
        ? process.env.NODE_ENV
        : DEFAULTS.ENVIRONMENT
      ,

      /**
       * A `Map` of custom file name extension / media type specifications (used to set / override the `Content-Type` HTTP header)
       *
       * @default new Map()
       */
      FILE_NAME_EXTENSION_MEDIA_TYPE_MAP: (
        configurationFromFile?.FILE_NAME_EXTENSION_MEDIA_TYPE_MAP
        ?? DEFAULTS.FILE_NAME_EXTENSION_MEDIA_TYPE_MAP
      ),

      /**
       * The host name to which the server is bound
       *
       * @default 'localhost'
       */
      HOST_NAME: (
        configurationFromCommandLineArguments.HOST_NAME
        ?? configurationFromFile?.HOST_NAME
        ?? DEFAULTS.HOST_NAME
      ),

      /**
       * The port number to which the server is bound
       *
       * @default 8020
       */
      PORT_NUMBER: (
        configurationFromCommandLineArguments.PORT_NUMBER
        ?? configurationFromFile?.PORT_NUMBER
        ?? DEFAULTS.PORT_NUMBER
      ),

      /**
       * The absolute path of the root folder served
       *
       * @default '.'
       */
      ROOT_FOLDER: path.resolve(
        configurationFromCommandLineArguments.ROOT_FOLDER
        ?? configurationFromFile?.ROOT_FOLDER
        ?? DEFAULTS.ROOT_FOLDER
      )
    };
  },

  /**
   * Attempts to read the certificates from the file system (required for HTTPS).
   */
  readCertificates: async () => {
    /**
     * The absolute path of the private key file (`.key`)
     */
    const privateKeyFilePath = path.join(CURRENT_FOLDER, `${configuration.CERTIFICATE_NAME}.key`);

    /**
     * The absolute path of the certificate signing request file (`.csr`)
     */
    const certificateSigningRequestFilePath = path.join(CURRENT_FOLDER, `${configuration.CERTIFICATE_NAME}.csr`);

    /**
     * The absolute path of the certificate file (`.crt`)
     */
    const certificateFilePath = path.join(CURRENT_FOLDER, `${configuration.CERTIFICATE_NAME}.crt`);
  
    try {
      // read the certificate files
      const [
        privateKey,
        certificateSigningRequest,
        certificate
      ] = await Promise.all(
        [
          privateKeyFilePath,
          certificateSigningRequestFilePath,
          certificateFilePath
        ].map(
          (filePath) => fs.readFile(
            filePath,
            {
              encoding: 'utf8'
            }
          )
        )
      );

      return {
        certificate: certificate,
        certificateSigningRequest: certificateSigningRequest,
        privateKey: privateKey
      };
    }
    catch (error) {
      // log the error
      logging.logError({ error: error });

      // rethrow the error if the `Error.code` value is _not_ `ENOENT` (“No such file or directory”)
      if (error.code !== 'ENOENT') throw error;

      // consume the error
      return {
        certificate: null,
        certificateSigningRequest: null,
        privateKey: null
      };
    }
  },

  /**
   * Reads the configuration from the command-line arguments.
   */
  readConfigurationFromCommandLineArguments: () => ({
    CERTIFICATE_NAME: validation.validateCertificateName(process.argv[5]),
    HOST_NAME: validation.validateHostName(process.argv[3]),
    PORT_NUMBER: validation.validatePortNumber( (typeof process.argv[4] === 'string') ? Number.parseInt(process.argv[4], 10) : null ),
    ROOT_FOLDER: validation.validateRootFolder(process.argv[2])
  }),

  /**
   * Attempts to read the configuration from the file system.
   */
  readConfigurationFromFile: async () => {
    try {
      /**
       * JSON configuration data
       */
      const configurationFromFileString = await fs.readFile(
        path.join(MODULE_FOLDER, 'configuration.json'),
        {
          encoding: 'utf8'
        }
      );

      /**
       * Parsed JSON configuration data, nominally of the type …
       *
       * ```json
       * {
       *   "certificate_name": string,
       *   "file_name_extension_media_type_map": [ "${file_name_extension}": string, "${media_type}": string ][],
       *   "host_name": string,
       *   "port_number": number,
       *   "root_folder": string
       * }
       * ```
       */
      const configurationFromFile = JSON.parse(configurationFromFileString);

      // abort if the parsed JSON is not an `object`
      if (
        (typeof configurationFromFile !== 'object')
        || (configurationFromFile === null)
      ) throw new TypeError('configuration.json');

      // sanitize and validate the configuration data

      const {
        certificate_name: certificateName,
        file_name_extension_media_type_map: fileNameExtensionMediaTypeMap,
        host_name: hostName,
        port_number: portNumber,
        root_folder: rootFolder
      } = { ...configurationFromFile };

      return {
        CERTIFICATE_NAME: validation.validateCertificateName(certificateName),
        FILE_NAME_EXTENSION_MEDIA_TYPE_MAP: validation.validateFileNameExtensionMediaTypeMap(fileNameExtensionMediaTypeMap),
        HOST_NAME: validation.validateHostName(hostName),
        PORT_NUMBER: validation.validatePortNumber(portNumber),
        ROOT_FOLDER: validation.validateRootFolder(rootFolder)
      };
    }
    catch (error) {
      // log the error
      logging.logError({ error: error });

      // consume the error
      return null;
    }
  }
});

/**
 * The `validation` namespace
 */
const validation = Object.freeze({
  /**
   * Validates that the specified certificate name is a non-empty `string`.
   */
  validateCertificateName: (certificateName) => (
    (typeof certificateName === 'string')
    && (certificateName !== '')
  )
    ? certificateName
    : null
  ,

  /**
   * Validates that the specified file name extension / media type map is of the type `[ string, string ][]`.
   */
  validateFileNameExtensionMediaTypeMap: (fileNameExtensionMediaTypeMap) => new Map(
    (
      Array.isArray(fileNameExtensionMediaTypeMap)
        ? fileNameExtensionMediaTypeMap
        : []
    ).filter(
      (fileNameExtensionMediaType) => (
        Array.isArray(fileNameExtensionMediaType)
        && (typeof fileNameExtensionMediaType[0] === 'string')
        && (fileNameExtensionMediaType[0] !== '')
        && (typeof fileNameExtensionMediaType[1] === 'string')
        && (fileNameExtensionMediaType[1] !== '')
      )
    )
  ),

  /**
   * Validates that the specified host name is a non-empty `string`.
   */
  validateHostName: (hostName) => (
    (typeof hostName === 'string')
    && (hostName !== '')
  )
    ? hostName
    : null
  ,

  /**
   * Validates that the specified port number is `80`, `443`, or in the range `1024` – `65535`.
   */
  validatePortNumber: (portNumber) => (
    (typeof portNumber === 'number')
    && (
      (portNumber === 80)
      || (portNumber === 443)
      || (
        (portNumber >= 1024)
        && (portNumber <= 65535)
      )
    )
  )
    ? portNumber
    : null
  ,

  /**
   * Validates that the specified root folder is a non-empty `string`.
   */
  validateRootFolder: (rootFolder) => (
    (typeof rootFolder === 'string')
    && (rootFolder !== '')
  )
    ? rootFolder
    : null  
});

/**
 * The default settings
 */
const DEFAULTS = Object.freeze({
  CERTIFICATE_NAME: 'localhost',
  ENVIRONMENT: 'development',
  FILE_NAME_EXTENSION_MEDIA_TYPE_MAP: new Map(),
  HOST_NAME: 'localhost',
  PORT_NUMBER: 8020,
  ROOT_FOLDER: '.'
});


/**
 * The absolute path of the current folder
 */
const CURRENT_FOLDER = process.cwd();

/**
 * The absolute path of the folder containing this module
 */
const MODULE_FOLDER = path.dirname( new URL(import.meta.url).pathname );

/** 
 * The server’s configuration
 */
const configuration = await utilities.getConfiguration();

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

// attempt to read the certificate files (required for HTTPS)
(
  {
    certificate,
    certificateSigningRequest,
    privateKey
  } = await utilities.readCertificates()
);

/**
 * Whether HTTPS is enabled
 */
const httpsEnabled = (
  (privateKey !== null)
  && (certificateSigningRequest !== null)
  && (certificate !== null)
);

/**
 * The `Koa` server instance
 */
const app = new Koa();

// set the `Koa.env` property
app.env = configuration.ENVIRONMENT;

// log errors
app.on(
  'error',
  (err, ctx) => {
    logging.logError({
      error: err,
      // ${IP address} ${HTTP request method} ${URL}
      // e.g., `::1 GET /`
      message: `${ctx.ip} ${ctx.method} ${ctx.url}`
    });
  }
);

// log access
app.use(
  async (ctx, next) => {
    await next();

    // ${IP address} ${HTTP response status code} ${HTTP request method} ${URL}
    // e.g., `::1 200 GET /`
    logging.logInformation({ message: `${ctx.ip} ${ctx.status} ${ctx.method} ${ctx.url}` });
  }
);

// append `'/'` and redirect (with a `302` “Found” HTTP status) on folder paths without a suffixed `'/'`
app.use(
  async (ctx, next) => {
    // if the requested path does not have an extension (i.e., does not include `'.'`) and does not end in `'/'`, test if it is a folder
    if (
      !ctx.path.includes('.')
      && !ctx.path.endsWith('/')
    ) {
      try {
        /**
         * File system information about the requested path
         */
        const stats = await fs.stat(`${configuration.ROOT_FOLDER}${ctx.path}`);

        // if the path is a folder, redirect to the path with `'/'` appended
        if ( stats.isDirectory() ) {
          ctx.redirect(`${ctx.path}/`);
        }
      }
      catch (error) {
        // if the `Error.code` value is _not_ `ENOENT` (“No such file or directory”) …
        if (error.code !== 'ENOENT') {
          // … log the error
          logging.logError({ error: error });
        }

        // … consume the error
      }
    }

    await next();
  }
);

// enable the `304` “Not Modified” HTTP status for `GET` requests
app.use( koaConditionalGet() );

// enable HTTP `ETag` support
app.use( koaEtag() );

// set the `Content-Type` HTTP header
app.use(
  async (ctx, next) => {
    await next();

    // abort on index document requests (paths ending in `'/'`)
    if ( ctx.path.endsWith('/') ) return;

    /**
     * The file name extension of the requested path (or `null`, if it does not have one)
     */
    const fileNameExtension = ctx.path.includes('.')
      ? ctx.path.slice(ctx.path.lastIndexOf('.') + 1)
      : null
    ;

    // set the `Content-Type` HTTP header based on the requested path’s file name extension …
    // … no file name extension: default to `Content-Type: text/plain`
    if (fileNameExtension === null) {
      ctx.type = 'text/plain';
    }
    // … mapped file name extension: use the media type value specified in the map
    else if ( configuration.FILE_NAME_EXTENSION_MEDIA_TYPE_MAP.has(fileNameExtension) ) {
      ctx.type = configuration.FILE_NAME_EXTENSION_MEDIA_TYPE_MAP.get(fileNameExtension);
    }
    // … unmapped file name extension: use `Koa`’s internal file name extension–lookup mechanism (<https://github.com/koajs/koa/blob/master/docs/api/response.md#responsetype-1>)
    else {
      ctx.type = fileNameExtension;
    }
  }
);

// serve the specified root folder as static content
app.use( koaStatic(configuration.ROOT_FOLDER) );

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
    host: configuration.HOST_NAME,
    port: configuration.PORT_NUMBER
  },
  () => {
    logging.logInformation({
      message:
`${logging.TERMINAL_CONTROL_SEQUENCES.BRIGHT}Backwater Systems${logging.TERMINAL_CONTROL_SEQUENCES.RESET} ◦ ${logging.TERMINAL_CONTROL_SEQUENCES.FOREGROUND_GREEN}static-server.js${logging.TERMINAL_CONTROL_SEQUENCES.RESET} started.
\t${logging.TERMINAL_CONTROL_SEQUENCES.FOREGROUND_YELLOW}▻${logging.TERMINAL_CONTROL_SEQUENCES.RESET} listening on:\t\t${logging.TERMINAL_CONTROL_SEQUENCES.BRIGHT}${httpsEnabled ? `${logging.TERMINAL_CONTROL_SEQUENCES.FOREGROUND_GREEN}https://${logging.TERMINAL_CONTROL_SEQUENCES.RESET}` : `${logging.TERMINAL_CONTROL_SEQUENCES.FOREGROUND_RED}http://${logging.TERMINAL_CONTROL_SEQUENCES.RESET}`}${configuration.HOST_NAME}:${configuration.PORT_NUMBER}${logging.TERMINAL_CONTROL_SEQUENCES.RESET}
\t${logging.TERMINAL_CONTROL_SEQUENCES.FOREGROUND_YELLOW}▻${logging.TERMINAL_CONTROL_SEQUENCES.RESET} root folder:\t\t${logging.TERMINAL_CONTROL_SEQUENCES.BRIGHT}${configuration.ROOT_FOLDER}${logging.TERMINAL_CONTROL_SEQUENCES.RESET}
\t${logging.TERMINAL_CONTROL_SEQUENCES.FOREGROUND_YELLOW}▻${logging.TERMINAL_CONTROL_SEQUENCES.RESET} environment:\t\t${logging.TERMINAL_CONTROL_SEQUENCES.BRIGHT}${configuration.ENVIRONMENT}${logging.TERMINAL_CONTROL_SEQUENCES.RESET}`
    });
  }
);