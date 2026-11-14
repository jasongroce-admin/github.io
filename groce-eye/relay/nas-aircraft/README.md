# Groce-Eye aircraft API for Synology

This small Docker service supplies the public Groce-Eye browser with nearby
aircraft observations. It has no NAS credentials, file mounts, or general proxy.
It requests only adsb.fi's documented 100 NM geographic endpoint and includes
the required adsb.fi attribution in its response. The site must also keep its
visible adsb.fi credit and link. The source permits personal, non-commercial
use with a 1-request-per-second public limit.

## Local test

Run `npm test`, then `npm start` from this directory. Check
`http://127.0.0.1:8788/health` and
`http://127.0.0.1:8788/v1/aircraft?lat=39.77&lon=-86.16`.

## NAS deployment

1. In Container Manager, create a project from this directory's `compose.yaml`.
   The service binds only to NAS loopback port 8788. It uses a read-only
   filesystem, no added Linux capabilities, and no volume mounts.
2. Test the two URLs from the NAS, then check that DSM, Plex, Sonarr, and NAS
   shares are unavailable through port 8788.
3. Install the current official Tailscale Synology package from Tailscale's
   package server. The older Synology Package Center version is not current.
4. In the Tailscale admin console, enable HTTPS certificates and grant the
   `funnel` node attribute only to this NAS's Tailscale IP. If that IP ever
   changes, update the policy before restarting Funnel.
5. Run `tailscale funnel --bg --https=443 http://127.0.0.1:8788` on the NAS.
   This forwards only the aircraft API through the NAS's `*.ts.net` hostname.
   No router forwarding or GoDaddy DNS changes are involved.
6. Verify `/health`, `/v1/aircraft`, and the site's CORS origin from outside
   the home network before publishing the static site's endpoint change.

The API rounds coordinates to quarter-degree cells and caches responses for
two minutes. It enforces at least two seconds between provider requests and
allows at most 120 upstream requests per hour. A recent cached value can be
served for up to 10 minutes if the provider fails. Its only public data route
is `GET /v1/aircraft` (`/aircraft` is a temporary compatibility alias).

Funnel is a public endpoint; CORS limits browser use but is not authentication.
Keep NAS administration and private apps on separate, private routes. Tailscale
Funnel is currently beta and has bandwidth limits; monitor availability if
site traffic grows.
