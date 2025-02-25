# Backwater Systems ◦ `static-server.js`

> ❝A fine HTTP(S) development server for static content❞

---

## About

_Powered by [`Koa`](https://koajs.com/)._

## Usage

```sh
NODE_ENV=development ./static-server.js \
	. `# [root_folder]` \
	localhost `# [host_name]` \
	8020 `# [port_number]` \
	localhost `# [certificate_name]`
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

	> **Note:** If the certificate files cannot be read, the server uses HTTP instead of HTTPS.

- #### `file_name_extension_media_type_map`

	**Default value:** `new Map()`

	Custom specifications of file name extensions mapped to `Content-Type` HTTP header values. Values for file name extensions not included in the map are determined via [`Koa`’s internal file name extension–lookup mechanism](https://github.com/koajs/koa/blob/master/docs/api/response.md#responsetype-1).

	For example, the following data results in files with the file name extension `.mustache` being served with the HTTP header `Content-Type: text/plain` …

	```json
	[
		[ "mustache", "text/plain" ]
	]
	```
	> **Note:** Files without a file name extension default to `Content-Type: text/plain`.

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

| #   | Name                                  |
| --: | ------------------------------------- |
|   1 | [Root folder](#root_folder)           |
|   2 | [Host name](#host_name)               |
|   3 | [Port number](#port_number)           |
|   4 | [Certificate name](#certificate_name) |

> **Note:** Command-line arguments override settings in the [configuration file](#configuration-file).

### Configuration file

Settings can be specified in a JSON file (`static-server.configuration.json`) located in the same folder as the server script.

The file should contain an object with any of the following (optional) properties …

```json
{
	"certificate_name": "",
	"file_name_extension_media_type_map": [
		[ "`${file_name_extension}`", "`${media_type}`" ]
	],
	"host_name": "",
	"port_number": "",
	"root_folder": ""
}
```

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

© 2020 – 2025 [Nate Gehringer](mailto:nate@backwater.systems) ◦ [Backwater Systems](https://backwater.systems/)