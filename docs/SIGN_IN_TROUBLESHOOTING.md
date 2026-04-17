# Can't sign in? Start here

If clicking **Sign in with Google** (or submitting the email form) spins
forever, fails instantly, or the page won't load, it's almost always a
networking issue on your device — not the app.

Walk through the steps below in order. Stop at the first one that works.

## 1. Disconnect any VPN

VPNs change your DNS resolver, and a handful of them (ProtonVPN, NordVPN,
Mullvad, Cloudflare WARP, many corporate VPNs) fail to resolve Supabase's
Cloudflare-fronted hostnames. Disconnect, try signing in, then reconnect
afterwards if you need it.

If you must keep the VPN on, change its DNS to `1.1.1.1` and `8.8.8.8` in
its settings panel.

## 2. Try a different browser

Chrome, Firefox, Safari. If one works and another doesn't, the broken
browser has either a stale DNS cache or a blocking extension.

## 3. Open an incognito / private window

Incognito disables extensions by default. If sign-in works in incognito,
the culprit is an extension — most commonly an ad-blocker (uBlock Origin,
AdBlock), a privacy tool (Privacy Badger, Ghostery, DuckDuckGo Privacy
Essentials), or Brave Shields. Whitelist `*.supabase.co` or disable the
extension on the app's domain.

## 4. Try on mobile data / phone hotspot

This rules in or out your home router or ISP. If sign-in works on hotspot
but not on Wi-Fi, your home network is filtering DNS. Fix by setting your
device's DNS servers to:

- Primary: `1.1.1.1`
- Secondary: `1.0.0.1` or `8.8.8.8`

### macOS

```bash
sudo networksetup -setdnsservers "Wi-Fi" 1.1.1.1 1.0.0.1
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
```

Revert later with: `sudo networksetup -setdnsservers "Wi-Fi" empty`

### Windows

Settings → Network & Internet → Wi-Fi → your network → **Edit DNS
settings** → Manual → IPv4 → Preferred `1.1.1.1`, Alternate `1.0.0.1`.

Then in an admin terminal:

```
ipconfig /flushdns
```

## 5. Clear browser cookies and DNS cache

Chrome / Brave / Edge:

- `chrome://net-internals/#dns` → **Clear host cache**
- `chrome://net-internals/#sockets` → **Flush socket pools**

Firefox: Settings → Privacy & Security → Cookies and Site Data → **Clear
Data**.

## 6. Still stuck — send this info to support

If none of the above worked, email support with:

1. Your operating system + browser + version.
2. Whether a VPN is active (and which).
3. The **exact URL in your address bar** at the moment sign-in fails.
4. A screenshot of DevTools → Network tab showing the failed request.

That packet of info lets support resolve it quickly. Without it, debugging
is a guessing game.
