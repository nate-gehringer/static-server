# Backwater Systems ◦ `static-server.js`

> ❝A fine HTTP(S) development server for static content❞

---

## About

_Powered by [`Koa`](https://koajs.com/)._

Licensed under the [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0).

## Usage

```sh
NODE_ENV=development ./static-server.js \
	. `# [root_folder]` \
	localhost `# [host_name]` \
	8020 `# [port_number]` \
	localhost `# [certificate_name]` \
	'{}' `# [headers] — stringified JSON` \
	'{}' `# [file_name_extension_media_types] — stringified JSON`
```

---

## Settings

### Details

- #### `certificate_name`

	**Default value:** `localhost`

	Given, for example – `localhost`, the following [certificate files](#self-signed-certificate-generation-example) are expected …
	- `./localhost.key`: Private key
	- `./localhost.csr`: Certificate signing request
	- `./localhost.crt`: Certificate

	> **Note:** If the certificate files cannot be read, the server falls back to HTTP instead of HTTPS.

- #### `file_name_extension_media_types`

	**Default value:** `{}`

	Custom specifications of file name extensions mapped to `Content-Type` HTTP header values. Values for file name extensions not included in the map are determined via [`Koa`’s internal file name extension–lookup mechanism](https://github.com/koajs/koa/blob/master/docs/api/response.md#responsetype-1).

	For example, the following value results in files with the file name extension `.mustache` being served with the HTTP header `Content-Type: text/plain` …

	```json
	{
		"mustache": "text/plain"
	}
	```

	> **Note:** Files without a file name extension default to `Content-Type: text/plain`.

- #### `headers`

	**Default value:** `{}`

	Custom HTTP headers that the server adds to responses.

	For example, the following value results in responses being served with the HTTP headers `Access-Control-Allow-Methods: GET` and `Access-Control-Allow-Origin: https://localhost` …

	```json
	{
		"Access-Control-Allow-Methods": "GET",
		"Access-Control-Allow-Origin": "https://localhost"
	}
	```

- #### `host_name`

	**Default value:** `localhost`

	The host name to which the server is bound.

- #### `port_number`

	**Default value:** `8020`

	The port number to which the server is bound. Must be `80`, `443`, or in the range `1024` – `65535`.

- #### `root_folder`

	**Default value:** `.`

	The relative path of the root folder served.

### Environment variables

- The `NODE_ENV` environment variable is respected and used for the `Koa.env` property if its value is …

	- `development` (default)
	- `production`

### Command-line arguments

| #   | Name                                                                  |
| --: | --------------------------------------------------------------------- |
|   1 | [`root_folder`](#root_folder)                                         |
|   2 | [`host_name`](#host_name)                                             |
|   3 | [`port_number`](#port_number)                                         |
|   4 | [`certificate_name`](#certificate_name)                               |
|   5 | [`headers`](#headers)                                                 |
|   6 | [`file_name_extension_media_types`](#file_name_extension_media_types) |

> **Note:** All of the command-line arguments are optional.

> **Note:** Command-line arguments override settings in the [configuration file](#configuration-file).

### Configuration file

Settings can be specified in a JSON file (`static-server.configuration.json`) located in the same folder as the server script.

For example, the default configuration is represented by the following …

```json
{
	"certificate_name": "localhost",
	"file_name_extension_media_types": {},
	"headers": {},
	"host_name": "localhost",
	"port_number": 8020,
	"root_folder": "."
}
```

The configuration file should validate against the following [JSON Schema](https://json-schema.org/) …

```json
{
	"$schema": "https://json-schema.org/draft/2020-12/schema",
	"$id": "https://code.backwater.systems/schemas/static-server.configuration.schema.json",
	"additionalProperties": false,
	"properties": {
		"certificate_name": {
			"minLength": 1,
			"type": "string"
		},
		"file_name_extension_media_types": {
			"additionalProperties": false,
			"patternProperties": {
				"^.+$": {
					"minLength": 1,
					"type": "string"
				}
			},
			"type": "object"
		},
		"headers": {
			"additionalProperties": false,
			"patternProperties": {
				"^.+$": {
					"minLength": 1,
					"type": "string"
				}
			},
			"type": "object"
		},
		"host_name": {
			"minLength": 1,
			"type": "string"
		},
		"port_number": {
			"anyOf": [
				{
					"maximum": 80,
					"minimum": 80
				},
				{
					"maximum": 443,
					"minimum": 443
				},
				{
					"maximum": 65535,
					"minimum": 1024
				}
			],
			"type": "integer"
		},
		"root_folder": {
			"minLength": 1,
			"type": "string"
		}
	},
	"title": "`@backwater-systems/static-server` configuration file",
	"type": "object"
}
```

> **Note:** All of the object properties are optional.

> **Note:** Settings in the configuration file are overriden by [command-line arguments](#command-line-arguments), if specified.

---

## HTTPS

### Self-signed certificate generation example

1. Execute the following commands …
	```sh
	openssl genrsa -out localhost.key 4096 && \
	openssl req -new -sha256 -key localhost.key -out localhost.csr && \
	openssl x509 -req -signkey localhost.key -in localhost.csr -out localhost.crt -days 365
	```
2. Respond to the _Distinguished Name_ information prompts as appropriate.

> Adapted from <https://nodejs.org/api/tls.html#tls_tls_ssl_concepts>.

---

© 2026 [Nate Gehringer](mailto:nate@backwater.systems) ◦ [Backwater Systems](https://backwater.systems/)