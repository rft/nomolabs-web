# Deployment

This site is built as a static site using `@sveltejs/adapter-static` and can be hosted anywhere that serves static files.

## Cloudflare Pages

1. Push your repo to GitHub
2. In the [Cloudflare dashboard](https://dash.cloudflare.com/), go to **Workers & Pages → Create → Pages → Connect to Git**
3. Select your repository
4. Set the build configuration:
   - **Build command:** `cd nomolabs-web && npm install && npm run build`
   - **Build output directory:** `nomolabs-web/build`
5. Under **Environment variables**, add any required variables (e.g. `VITE_GITHUB_TOKEN`)
6. Click **Save and Deploy**

### Deploy Hook

To allow external repositories to trigger a rebuild (e.g. from public-notes), create a deploy hook:

`Settings → Builds & Deployments → Deploy Hooks → Add hook`

Copy the URL and store it as a secret in any repo that should trigger deploys. See [notes-integration.md](notes-integration.md) for the full setup.

---

## Self-Hosting

### With Docker (via Nix)

The flake builds a Docker image using `pkgs.dockerTools` — no Dockerfile needed.

```sh
nix build .#dockerImage
podman load < result
podman run -p 3000:3000 nomolabs:latest
```

Or with Docker:

```sh
docker load < result
docker run -p 3000:3000 nomolabs:latest
```

The container serves the app on port 3000. Use a reverse proxy (Caddy or nginx) in front of it to handle TLS and your domain.

#### Caddy reverse proxy

```caddyfile
example.com {
    reverse_proxy localhost:3000
}
```

#### nginx reverse proxy

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

### With Nix (no Docker)

Build the app directly:

```sh
nix build .#nomolabs-app
```

Output is in `./result/build/`. Run it with:

```sh
node result/build/index.js
```

Or copy `result/build/` to wherever your web server expects static files.

---

### Automatic deploys (self-hosted)

To replicate the deploy hook behaviour, expose a small webhook listener that pulls and rebuilds on push. A minimal example using Node.js:

```js
// webhook.js
import { createServer } from 'http';
import { execSync } from 'child_process';
import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.WEBHOOK_SECRET;
const REPO = '/var/www/nomolabs';

createServer((req, res) => {
    if (req.method !== 'POST') return res.writeHead(405).end();

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        if (SECRET) {
            const sig = Buffer.from(req.headers['x-hub-signature-256'] ?? '', 'utf8');
            const expected = Buffer.from(
                'sha256=' + createHmac('sha256', SECRET).update(body).digest('hex'),
                'utf8'
            );
            if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) {
                return res.writeHead(401).end();
            }
        }

        try {
            execSync(`cd ${REPO} && git pull && nix build .#dockerImage && podman load < result && podman restart nomolabs`, { stdio: 'inherit' });
            res.writeHead(200).end('ok');
        } catch (e) {
            res.writeHead(500).end('build failed');
        }
    });
}).listen(9000, () => console.log('Webhook listener on :9000'));
```

Run it with:

```sh
WEBHOOK_SECRET=your-secret node webhook.js
```

Then in your notes repo's GitHub Action, POST to `http://your-server:9000` instead of a Cloudflare deploy hook URL. Set `WEBHOOK_SECRET` as the repo secret and restrict the endpoint to GitHub's IP ranges via your firewall if not using signature verification.
