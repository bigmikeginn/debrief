# n8n + Openclaw Recovery Log (jitsudo.ca)

Date: 2026-04-15
Server: Oracle VM (`155.248.222.58`)
Domain DNS Provider: Hostinger (`ns1.dns-parking.com`, `ns2.dns-parking.com`)

## What Broke

After nameserver changes at Hostinger, DNS no longer had the records needed for Oracle-hosted services.

Symptoms:
- `n8n.jitsudo.ca` not reachable (`ERR_CONNECTION_TIMED_OUT`)
- Openclaw UI loaded but showed `origin not allowed`, then later `pairing required`

## Root Causes

1. DNS records for service subdomains were missing after nameserver switch.
2. Reverse proxy/TLS path needed to be re-established on Oracle VM.
3. VM firewall allowed SSH only (22), but web ports (80/443) were blocked.
4. Openclaw `gateway.controlUi.allowedOrigins` did not include `https://openclaw.jitsudo.ca`.
5. Openclaw device pairing was pending for the browser device.

## Final Working State

- `https://n8n.jitsudo.ca` -> working
- `https://openclaw.jitsudo.ca` -> working
- Both services run simultaneously on one Oracle VM using Caddy reverse proxy + TLS.

## DNS Records Required (Hostinger)

In Hostinger DNS Zone for `jitsudo.ca`:
- `A` `n8n` -> `155.248.222.58`
- `A` `openclaw` -> `155.248.222.58`

Existing website records for `@` and `www` can remain pointed to Hostinger/CDN.

## Server Changes Applied

### 1) Verified local app ports
- n8n container bound to `127.0.0.1:5678`
- Openclaw container bound to `127.0.0.1:8080`

### 2) Installed/configured Caddy
Configured `/etc/caddy/Caddyfile`:

```caddy
n8n.jitsudo.ca {
  encode zstd gzip
  reverse_proxy 127.0.0.1:5678
}

openclaw.jitsudo.ca {
  encode zstd gzip
  reverse_proxy 127.0.0.1:8080
}
```

Then enabled and restarted Caddy.

### 3) Opened firewall ports
- Allowed `80/tcp`
- Allowed `443/tcp`

### 4) Openclaw origin allowlist fix
Updated `~/.openclaw/openclaw.json` to include:
- `https://openclaw.jitsudo.ca`
under:
- `gateway.controlUi.allowedOrigins`

### 5) Openclaw device pairing approval
Approved pending browser device request with Openclaw CLI inside container.

## Useful Commands (for next incident)

### DNS checks (from local machine)
```powershell
nslookup n8n.jitsudo.ca 1.1.1.1
nslookup openclaw.jitsudo.ca 1.1.1.1
nslookup -type=ns jitsudo.ca 1.1.1.1
```

### Oracle login
```powershell
ssh -i "C:\Users\bigmi\OneDrive\Desktop\AI stuff\Oracle Keys\oracle private key.key" ubuntu@155.248.222.58
```

### Service/container status
```bash
sudo docker ps
sudo systemctl status caddy
sudo ss -tulpn | grep -E ':80|:443|:5678|:8080'
```

### Caddy logs
```bash
sudo journalctl -u caddy -n 120 --no-pager
```

### Openclaw device pairing
```bash
sudo docker exec openclaw openclaw devices list --json
sudo docker exec openclaw openclaw devices approve <requestId> --json
```

## Browser-side quick fixes

If n8n is still unreachable after changes:
1. Run `ipconfig /flushdns`
2. Open an Incognito window
3. Re-test URLs

## Operational Notes

- Keep one DNS authority only. If nameservers are Hostinger, all required app records must be in Hostinger DNS.
- Do not remove `n8n` / `openclaw` A records during website/domain changes.
- If Openclaw shows `pairing required`, this is often expected security behavior, not a server outage.

## Follow-up Recommendation

Rotate exposed secrets/tokens that appeared in troubleshooting output:
- n8n env secrets (`/opt/n8n/.env`)
- Openclaw gateway token and any API keys in Openclaw config

