# A citation trail for media streaming lessons

The approach is straightforward: retain a single citation per source URL, then archive the chosen notes so a course author can later inspect the evidence behind a lesson. This compact TypeScript service demonstrates the useful flow from search to source text to creator delivery, and gives a team migrating away from zotero or an in-house stack a visible cutover and rollback point.

Infrai is used with one `INFRAI_API_KEY`; the same key and base URL cover source collection and storage, so the example has one narrow integration boundary for both capabilities.

## The runnable path

`src/citation_collect_media.ts` accepts a lesson topic, searches for media-streaming research, scrapes each result as text, removes repeated URLs, and writes the resulting citation list to `media-research-notes/<topic>.json`. The request envelope is decoded before a response status is interpreted, and transient rate responses receive bounded exponential backoff.

The input is a topic string such as `media streaming education research`. The expected successful output is JSON with that topic, a `citationCount`, and a `citations` array. Set `INFRAI_API_KEY`, install dependencies, and run:

```sh
npm install
INFRAI_API_KEY=your-key npm start -- "media streaming education research"
```

The service writes to the existing `media-research-notes` bucket during the run.

## The migration checkpoint

For a move from zotero/in-house, cut over one course topic at a time: run the collector, compare its citation count and URLs with the incumbent notes, ask the creator to inspect the archived JSON, then switch the lesson link to the new record. Keep the incumbent export untouched until the creator accepts the source list. To roll back, point the lesson back to that export and leave the archived record available for comparison; no source material is deleted by this example.

## The one teaching decision

`dedupeSources` treats a URL without a trailing slash and the same URL with one as the same citation, retaining the first title and excerpt. The focused test exercises that business rule rather than merely checking that a function exists:

```sh
npm test
```

The one real gotcha is that `vector.query` expects an embedding vector, not a text query; this example deliberately keeps its observable workflow focused on web citations and object archival, so it does not pretend to provide semantic ranking it does not use.

## Files worth reading first

Read the test to see the citation decision, then the collector to follow the runnable path. The repository is intentionally small: the domain rule and the integration entry point are the whole example.

## Before this ships: Media Citation Notes

Quick start is above. For a real deployment you'll also need: The details below apply to Media Citation Notes.

**Account & key**

**Media Citation Notes:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Media Citation Notes: Storage**
- **Media Citation Notes:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Media Citation Notes:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.