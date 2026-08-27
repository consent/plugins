/*
 * FakeMute + deafen
 * Allows user to toggle a fake mute/deafen icon
 * leaves local RTC audio alone so you can still hear (and speak unless actually muted).
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher, Menu, React } from "@webpack/common";

const Gateway = findByPropsLazy("getSocket");
const SelectedChannelStore = findByPropsLazy("getVoiceChannelId");
const ChannelStore = findByPropsLazy("getChannel", "getDMFromUserId");
const MediaEngineStore = findByPropsLazy("isDeaf", "isMute");

let plugin: any;

function pushNow() {
    plugin?.pushVoiceState?.();
}

const settings = definePluginSettings({
    fakeMute: {
        type: OptionType.BOOLEAN,
        description: "Appear muted to others without muting locally",
        default: false,
        onChange: pushNow,
    },
    fakeDeaf: {
        type: OptionType.BOOLEAN,
        description: "Appear deafened to others without deafening locally",
        default: false,
        onChange: pushNow,
    },
    enableKeybind: {
        type: OptionType.BOOLEAN,
        description: "Toggle fake mute+deaf with Ctrl+Shift+Q",
        default: true,
    },
});

type GatewaySocket = {
    send: (op: number, data?: any, ...rest: any[]) => any;
};

let hooked: GatewaySocket | null = null;
let originalSend: GatewaySocket["send"] | null = null;

function applyFake(data: any) {
    if (!data) return data;
    if (settings.store.fakeMute || settings.store.fakeDeaf) data.self_mute = true;
    if (settings.store.fakeDeaf) data.self_deaf = true;
    return data;
}

function hookSocket() {
    const socket: GatewaySocket | undefined = Gateway?.getSocket?.();
    if (!socket || socket === hooked) return;

    if (hooked && originalSend) {
        try { hooked.send = originalSend; } catch { /* socket already gone */ }
    }

    originalSend = socket.send.bind(socket);
    hooked = socket;
    const orig = originalSend;

    socket.send = function (op: number, data?: any, ...rest: any[]) {
        if (op === 4) applyFake(data);
        return orig(op, data, ...rest);
    };
}

function onKeyDown(event: KeyboardEvent) {
    if (!settings.store.enableKeybind) return;
    if (!(event.ctrlKey && event.shiftKey && event.code === "KeyQ")) return;
    event.preventDefault();
    const next = !(settings.store.fakeDeaf && settings.store.fakeMute);
    settings.store.fakeMute = next;
    settings.store.fakeDeaf = next;
    plugin.pushVoiceState();
}

plugin = definePlugin({
    name: "FakeMuteDeaf",
    description: "Appear muted/deafened in voice while still hearing locally",
    authors: [{ name: "Quarz", id: 1456081065121812634n }],
    enabledByDefault: true,
    settings,
    dependencies: ["ContextMenuAPI"],

    patches: [
        {
            find: "}voiceStateUpdate(",
            replacement: {
                match: /self_mute:([^,]+),self_deaf:([^,]+),self_video:([^,]+)/,
                replace: "self_mute:$self.getFakeState($1,'mute'),self_deaf:$self.getFakeState($2,'deaf'),self_video:$3",
            },
        },
    ],

    getFakeState(original: any, type: "mute" | "deaf") {
        if (type === "mute" && (settings.store.fakeMute || settings.store.fakeDeaf)) return true;
        if (type === "deaf" && settings.store.fakeDeaf) return true;
        return original;
    },

    pushVoiceState() {
        hookSocket();
        const socket = Gateway?.getSocket?.();
        const channelId = SelectedChannelStore?.getVoiceChannelId?.();
        if (!socket || !channelId) return;

        const channel = ChannelStore?.getChannel?.(channelId);
        socket.send(4, {
            guild_id: channel?.guild_id ?? null,
            channel_id: channelId,
            self_mute: !!(settings.store.fakeMute || settings.store.fakeDeaf || MediaEngineStore?.isMute?.()),
            self_deaf: !!(settings.store.fakeDeaf || MediaEngineStore?.isDeaf?.()),
            self_video: MediaEngineStore?.isVideoEnabled?.() ?? false,
            flags: 0,
        });
    },

    contextMenus: {
        "audio-device-context"(children: any[]) {
            children.push(
                <Menu.MenuSeparator />,
                <Menu.MenuCheckboxItem
                    id="spill-fake-mute"
                    label="Fake Mute"
                    checked={settings.store.fakeMute}
                    action={() => {
                        settings.store.fakeMute = !settings.store.fakeMute;
                        plugin.pushVoiceState();
                    }}
                />,
                <Menu.MenuCheckboxItem
                    id="spill-fake-deaf"
                    label="Fake Deaf"
                    checked={settings.store.fakeDeaf}
                    action={() => {
                        settings.store.fakeDeaf = !settings.store.fakeDeaf;
                        plugin.pushVoiceState();
                    }}
                />,
            );
        },
        account(children: any[]) {
            children.push(
                <Menu.MenuSeparator />,
                <Menu.MenuCheckboxItem
                    id="spill-fake-mute-acc"
                    label="Fake Mute"
                    checked={settings.store.fakeMute}
                    action={() => {
                        settings.store.fakeMute = !settings.store.fakeMute;
                        plugin.pushVoiceState();
                    }}
                />,
                <Menu.MenuCheckboxItem
                    id="spill-fake-deaf-acc"
                    label="Fake Deaf"
                    checked={settings.store.fakeDeaf}
                    action={() => {
                        settings.store.fakeDeaf = !settings.store.fakeDeaf;
                        plugin.pushVoiceState();
                    }}
                />,
            );
        },
    },

    start() {
        hookSocket();
        this._onVoice = () => {
            hookSocket();
            this.pushVoiceState();
        };
        FluxDispatcher.subscribe("CONNECTION_OPEN", this._onVoice);
        FluxDispatcher.subscribe("RTC_CONNECTION_STATE", this._onVoice);
        window.addEventListener("keydown", onKeyDown);
        this._timer = window.setInterval(hookSocket, 2500);
    },

    stop() {
        window.clearInterval(this._timer);
        window.removeEventListener("keydown", onKeyDown);
        try {
            FluxDispatcher.unsubscribe("CONNECTION_OPEN", this._onVoice);
            FluxDispatcher.unsubscribe("RTC_CONNECTION_STATE", this._onVoice);
        } catch { /* dispatcher gone */ }
        if (hooked && originalSend) {
            try { hooked.send = originalSend; } catch { /* socket gone */ }
        }
        hooked = null;
        originalSend = null;
        settings.store.fakeMute = false;
        settings.store.fakeDeaf = false;
    },
});

export default plugin;
