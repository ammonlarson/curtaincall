# Broadway Shows Import Data

## Source

- **Source:** broadway.com/shows
- **Collection date:** 2026-04-05
- **Total shows:** 41 currently running Broadway productions

## Files

- `batch-1.json` — 41 shows (within the 50-show API limit)

## Usage

Upload via the Curtain Call admin panel's bulk import feature, or POST directly to `/admin/shows/bulk`.

## Category Mapping

Broadway.com does not use the same categories as Curtain Call. The following mapping was applied:

| Broadway.com classification | Curtain Call category |
|---|---|
| Original musical | `musical` |
| Original play (comedy, drama) | `play` |
| Musical revival or play revival | `revival` |
| Concert, immersive, or special event | `special` |

## Scope

- **Included:** Shows currently performing at Broadway theaters (500+ seat venues in the Theater District), including shows in preview as of the collection date.
- **Excluded:** Off-Broadway shows (e.g., New World Stages, Minetta Lane Theatre), immersive experiences at non-traditional venues, upcoming shows not yet in previews, and limited Encores! engagements at City Center.

## Optional Fields

Optional metadata (creative team, dates) was included when reliably sourced from broadway.com show pages. Fields were left blank rather than estimated when broadway.com did not provide the information directly.
