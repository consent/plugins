# -.-
![Vencord](https://img.shields.io/badge/client-Vencord-5865F2)
![License](https://img.shields.io/badge/license-GPL--3.0-blue)
Cool plugins made for the Vencord client (https://vencord.dev/) for Discord

Thanks to [Vencord](https://github.com/Vendicated/Vencord) for making this possible. 


## Plugin installation guide 

This plugin is **not** in the official Vencord plugin repository, so you
need to build Vencord from source with this plugin dropped into its
`src/userplugins` folder. It's more involved than a normal Vencord install,
but it's a one-time setup — after that, updating is just `git pull` +
`pnpm build` + `pnpm inject`.

### 1. Install prerequisites

You need:

- **Git** — <https://git-scm.com/downloads>
- **Node.js** (LTS, v18 or newer) — <https://nodejs.org/>
- **pnpm** — install it after Node.js is installed:

  ```sh
  npm install -g pnpm
  ```

Verify everything is on your PATH:

```sh
git --version
node --version
pnpm --version
```

### 2. Get the Vencord source

```sh
git clone https://github.com/Vendicated/Vencord
cd Vencord
pnpm install
```

### 3. Add the desired plugin(s)

The plugins are formatted as:
<https://github.com/consent/plugins/blob/main/(PluginFolderName)/index.tsx> (with 
PluginFolderName being the desired plugin). Clone that repo
somewhere outside of Vencord, then copy just the `PluginFolderName` folder into
Vencord's `src/userplugins`:

```sh
git clone https://github.com/consent/plugins
```

Copy (or move) `plugins/PluginFolderName` into `Vencord/src/userplugins/PluginFolderName`.

Your folder layout should now look like:

```
Vencord/
└─ src/
   └─ userplugins/
      └─ PluginFolderName/
         └─ index.tsx
```

### 4. Build Vencord

```sh
pnpm build
```

This compiles Vencord (including every plugin under `src/userplugins`,
so `PluginFolderName` gets picked up automatically — no registration step
needed) into the `dist/` folder.

### 5. Inject into your Discord install

```sh
pnpm inject
```

This launches an interactive picker — choose the Discord install you want
patched (Stable / PTB / Canary, or a custom path) and confirm. It patches
that Discord's `app.asar` to load your freshly built Vencord.

Fully close Discord from the system tray and reopen it afterwards.

### 6. Enable the plugin

In Discord, go to **User Settings → Vencord → Plugins**, search for
your installed plugin(s) and enable it. Click the plugin's settings icon to
configure the keybind and defaults.

## Uninstalling

Run `pnpm inject` again from inside the `Vencord` folder, pick the same
Discord install, and choose the uninstall/unpatch option. This restores
Discord's original, unpatched files.


## Disclaimer

This plugin modifies Discord's client behavior via Vencord and is not
affiliated with or endorsed by Discord Inc. Client modifications are
against Discord's Terms of Service; use at your own risk. This plugin
only changes what voice-state flags are sent to Discord's gateway and
does not read, log, or transmit any additional data.


## License

[GPL-3.0-or-later](LICENSE), matching Vencord's own license, since this
plugin is a derivative work built against and distributed for use with it.
