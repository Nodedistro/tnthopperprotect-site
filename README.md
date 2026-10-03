# TNT Hopper Protect

TNT Hopper Protect is a lightweight Minecraft plugin and mod that protects hopper minecarts from TNT explosions while keeping normal TNT block destruction enabled.

## Features

- Protects hopper minecarts from TNT explosions
- TNT still explodes and destroys regular blocks normally
- Helps protect hopper-minecart collection and transportation systems
- Lightweight and focused, with no unnecessary gameplay systems
- Supports all worlds or a selected-world allowlist on Paper
- Simple configuration
- Builds for Paper, Fabric, Forge, and NeoForge

## How it works

Normally, an explosion can damage nearby blocks and hopper minecarts. TNT Hopper Protect changes only the hopper-minecart behavior: when an explosion would damage or destroy one, that destruction is prevented. The explosion itself is not cancelled, so surrounding blocks are still affected normally.

## Paper configuration

```yaml
protect-hopper-minecarts: true
enabled-worlds: []
```

An empty `enabled-worlds` list enables protection in every world. Add world names to limit protection to selected worlds. Restart after changing the configuration.

## Releases and automatic announcements

Releases are published on [Modrinth](https://modrinth.com/plugin/tnt-hopper-protect/versions). GitHub Actions checks Modrinth every 15 minutes and adds each new stable loader release to the website Updates page and configured Discord channel. It deduplicates by Modrinth version ID and requires the backend to confirm Discord delivery.

## Website

```bash
npm install
npm start
```

Open `http://localhost:3000`.
