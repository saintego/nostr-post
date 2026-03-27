PWA Web Share Target example for nostr-post

How to run

This demo must be served from localhost or HTTPS to test PWA install and the
Web Share Target API. Chrome on Android is the recommended test environment.

Quick run with `npx serve`:

```bash
# from repo root
npx serve examples/pwa-share -l 8080
# open http://localhost:8080/examples/pwa-share/
```

Alternative using http-server:

```bash
npx http-server examples/pwa-share -p 8080
```

Testing the share target

1. Open the page in Chrome (Android recommended) and install the PWA ("Install app").
2. From another app (or the OS share sheet), choose "Share" and select this PWA.
3. The PWA will receive the shared data and present it on the page.

Manual curl test (simulates a share POST):

```bash
curl -v -X POST -F "title=Hello" -F "text=Shared from curl" http://localhost:8080/examples/pwa-share/share-target
```

Limitations

- Web Share Target only triggers for installed PWAs. Desktop browsers vary in support.
- Files uploaded through the share target are available as FormData file objects; this example only enumerates their names and types.
