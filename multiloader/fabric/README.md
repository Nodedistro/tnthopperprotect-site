# TNT Hopper Protect — Fabric

This Fabric build targets Minecraft 26.1.2 and Java 25.

It protects hopper minecarts from explosion damage while leaving TNT and normal block destruction unchanged.

Build the Modrinth-ready JAR with:

```bash
gradle clean prepareModrinthJar --no-daemon
```

Upload only:

`build/modrinth/TNT-Hopper-Protect-Fabric-2.0.0+mc26.1.2.jar`

The build refuses to create this file unless `fabric.mod.json` is present at the root of the remapped Fabric JAR.
