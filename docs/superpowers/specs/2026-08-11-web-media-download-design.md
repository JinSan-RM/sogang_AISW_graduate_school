# Web Media Download Design

## Problem

On the deployed web app, selecting either attachment on post 400 (`2025년 2학기 머신러닝2 - 이영섭교수님`) requests `/api/media/{id}/access-url`, but it never requests the returned file URL. The signed URLs themselves return the complete PDF and DOCX payloads with HTTP 200 and `Content-Disposition: attachment`.

The screens await the access-URL API and then call React Native Web's `Linking.openURL`. On web this uses `window.open(..., "_blank")`. Because the call occurs after an asynchronous boundary, the browser can treat it as an unsolicited popup and block it.

The migrated attachments have legacy placeholder names, but their bytes, MIME types, sizes, and signed delivery are valid. Filename metadata is therefore a separate migration-quality issue, not the cause of the failed download.

## Chosen Behavior

- Resolve private and managed media URLs exactly as today.
- On web, open a resolved attachment URL with same-tab navigation. Same-tab navigation is not subject to popup blocking, and the server's attachment disposition starts the download without replacing the page.
- On iOS and Android, retain `Linking.openURL` so native file handling remains unchanged.
- Apply the same behavior to attachment rows on both the post-detail screen and the post create/edit screen.
- Preserve the screens' existing error handling when URL resolution or opening fails.

## Design

Add a small platform-independent `openMediaUrl` utility. The caller supplies the platform and the two effects (`assignWebLocation` and `openExternalUrl`), which keeps browser and React Native globals out of the utility and makes the routing contract directly testable.

```ts
type OpenMediaUrlOptions = {
  platform: string;
  assignWebLocation: (url: string) => void;
  openExternalUrl: (url: string) => Promise<unknown>;
};

async function openMediaUrl(url: string, options: OpenMediaUrlOptions): Promise<void>;
```

For `platform === "web"`, the utility calls only `assignWebLocation(url)`. For every other platform it awaits only `openExternalUrl(url)`. Errors are not swallowed.

## Verification

- Unit test that web uses same-tab assignment and never the external/new-window opener.
- Unit test that a native platform uses the external opener and never browser assignment.
- Run the full frontend test suite and TypeScript check.
- Export the web bundle to confirm the browser branch compiles in Expo.

## Out of Scope

- Renaming legacy attachment records or changing migration data.
- Backend media, signing, or download-response changes.
- Changing ordinary external links that are not attachment downloads.
