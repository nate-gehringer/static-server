# Backwater Systems ◦ `static-server.js`

> A fine HTTP(S) server for static content

---

## Usage

```sh
[NODE_ENV=development] node static-server.js \
  [${content_folder} = .] \
  [${host_name} = localhost] \
  [${port_number} = 8020] \
  [${certificate_name} = localhost]
```

## Settings

### Environment variables

The `NODE_ENV` environment variable is respected if its value is `'development'` (default) or `'production'`.

### Command-line arguments

| #   | Name             | Default value |
| --: | ---------------- | ------------- |
|   1 | Content folder   | `.`           |
|   2 | Host name        | `localhost`   |
|   3 | Port number      | `8020`        |
|   4 | Certificate name | `localhost` ¹ |

> ¹ **Note:** If the certificate files cannot be read, the server uses HTTP instead of HTTPS.
> 
> Given e.g., `localhost`, the following files are expected …
> - `./localhost.key`: Private key
> - `./localhost.csr`: Certificate signing request
> - `./localhost.crt`: Certificate

## HTTPS

### Self-signed certificate generation example

1. Execute the following commands …
    ```sh
    openssl genrsa -out localhost.key 2048 && \
    openssl req -new -sha256 -key localhost.key -out localhost.csr && \
    openssl x509 -req -signkey localhost.key -in localhost.csr -out localhost.crt -days 365
    ```
2. Respond to the _Distinguished Name_ information prompts as appropriate.

Adapted from <https://nodejs.org/api/tls.html#tls_tls_ssl_concepts>.

---

## About

_Powered by [`Koa`](https://koajs.com/)._

Written by [Nate Gehringer](mailto:ngehringer@gmail.com).

© 2020 [Backwater Systems](https://backwater.systems)