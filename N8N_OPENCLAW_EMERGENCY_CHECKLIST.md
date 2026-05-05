# n8n + Openclaw Emergency Checklist

1. Verify DNS records in Hostinger DNS zone:
   - A n8n -> 155.248.222.58
   - A openclaw -> 155.248.222.58

2. Flush local DNS cache:
   - Run: ipconfig /flushdns
   - Re-test in Incognito.

3. SSH to Oracle:
   - ssh -i "C:\Users\bigmi\OneDrive\Desktop\AI stuff\Oracle Keys\oracle private key.key" ubuntu@155.248.222.58

4. Check services:
   - sudo docker ps
   - sudo systemctl status caddy

5. Confirm ports/firewall:
   - sudo ufw status
   - Ensure 80/tcp and 443/tcp are allowed.

6. Check reverse proxy config:
   - sudo cat /etc/caddy/Caddyfile
   - n8n.jitsudo.ca -> 127.0.0.1:5678
   - openclaw.jitsudo.ca -> 127.0.0.1:8080

7. Restart proxy/services if needed:
   - sudo systemctl restart caddy
   - sudo docker restart n8n_n8n_1 openclaw

8. If Openclaw says "origin not allowed":
   - Add https://openclaw.jitsudo.ca to gateway.controlUi.allowedOrigins in ~/.openclaw/openclaw.json
   - Restart openclaw container.

9. If Openclaw says "pairing required":
   - sudo docker exec openclaw openclaw devices list --json
   - sudo docker exec openclaw openclaw devices approve <requestId> --json

10. Validate live URLs:
   - https://n8n.jitsudo.ca
   - https://openclaw.jitsudo.ca
