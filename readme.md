# Nomolabs

A SvelteKit web application with a Nix flake for reproducible development and Docker image builds.

## Docs

- [Blog / Notes Integration](docs/notes-integration.md) — how content from public-notes is fetched and deployed
- [Deployment](docs/deployment.md) — deploying to Cloudflare Pages or self-hosting

## Prerequisites

- [Nix](https://nixos.org/download/) with flakes enabled

To enable flakes, add the following to your Nix configuration (`/etc/nix/nix.conf` or `~/.config/nix/nix.conf`):

```
experimental-features = nix-command flakes
```

## Development Setup

### 1. Enter the development shell

```sh
nix develop
```

This drops you into a shell with Node.js 20 and pnpm available.

### 2. Install dependencies

```sh
cd nomolabs-web
npm install
```

### 3. Start the development server

```sh
npm run dev
```

The app will be available at `http://localhost:5173`. To open it automatically in a browser:

```sh
npm run dev -- --open
```

### Other useful commands

```sh
npm run build       # production build
npm run preview     # preview the production build locally
npm run check       # type-check with svelte-check
npm run format      # format with prettier
npm run lint        # check formatting
```

## Updating Node packages

All commands should be run from the `nomolabs-web` directory inside `nix develop`.

### Update all packages (within semver range)

```sh
npm update
```

This updates packages to the latest version allowed by the version ranges in `package.json` (e.g., `^5.49.2` allows any `5.x.x`).

### Update a specific package

```sh
npm update <package-name>
```

### Update packages beyond their semver range (major versions)

```sh
npx npm-check-updates -u   # rewrites package.json with the latest versions
npm install                 # installs and updates package-lock.json
```

### Add a new package

```sh
npm install <package-name>            # runtime dependency
npm install -D <package-name>         # dev dependency
```

### After any package change

Update the Nix hash in `flake.nix`. The `npmDepsHash` field must match the lockfile. To regenerate it:

```sh
# From the repo root, set npmDepsHash to an empty string or pkgs.lib.fakeSha256,
# then run the build — Nix will print the correct hash in the error output.
nix build .#nomolabs-app 2>&1 | grep "got:"
```

Copy the printed hash into the `npmDepsHash` field in `flake.nix`.

## Building

### Production app

```sh
nix build .#nomolabs-app
```

Output is in `./result/`.

### Docker image

```sh
nix build .#dockerImage
```

This produces a tarball at `./result`. Load it into Podman with:

```sh
podman load < result
podman run -p 3000:3000 nomolabs:latest
```
