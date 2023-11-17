import EventEmitter from 'eventemitter3';
import WebSocket from 'isomorphic-ws';

declare function debug(...scopes: string[]): (...args: any) => void;

declare class MidjourneyWs extends EventEmitter<MjEvents> {
    opts: MidJourneyFullOptions;
    wsClient: WebSocket;
    private lastSequence;
    private heartbeatTask;
    private reconnectionTask;
    private msgMap;
    constructor(opts: MidJourneyFullOptions);
    private connect;
    private auth;
    private heartbeat;
    private message;
    private handleMessage;
    private handleMessageCreate;
    private handleMessageUpdate;
    private handleMessageDelete;
    private processingImage;
    private emitNonce;
    private emitEmbed;
    waitReady(): Promise<any>;
    waitMessage({ nonce, parentId, cb }: {
        nonce: string;
        parentId?: string;
        cb?: MessageCallBack;
    }): Promise<MjMessage>;
}

interface MidJourneyFullOptions {
    token: string;
    guild_id: string;
    channel_id: string;
    skipHeartbeat: boolean;
    apiBaseUrl: string;
    wsBaseUrl: string;
    imgBaseUrl: string;
    fetch: typeof fetch;
    discordsaysUrl: string;
    session_id?: string;
    ws?: MidjourneyWs;
    user?: MjOriginMessage['user'];
    debug?: typeof debug;
}
type MidJourneyOptions = Pick<MidJourneyFullOptions, 'token' | 'channel_id' | 'guild_id'> & Partial<Omit<MidJourneyFullOptions, 'token' | 'channel_id' | 'guild_id' | 'ws' | 'user' | 'discordsaysUrl' | 'session_id'>>;
interface ApplicationCommond {
    version: string;
    id: string;
    name: string;
    type: number;
    options: {
        type: number;
        name: string;
        [key: string]: any;
    }[];
    [key: string]: any;
}
interface MjOriginMessage {
    id: string;
    flags: number;
    content: string;
    type: 0 | 19 | 20;
    components: {
        components: any[];
    }[];
    attachments: {
        filename: string;
        url: string;
        height: number;
        width: number;
    }[];
    timestamp: string;
    channel_id: string;
    interaction: {
        name: string;
    };
    embeds: {
        description: string;
        title: string;
        color: number;
        type: string;
        footer: {
            text: string;
        };
    }[];
    message_reference: {
        message_id: string;
    };
    nonce?: string;
    heartbeat_interval?: number;
    session_id?: string;
    user?: any;
    custom_id?: string;
}
interface MjMessage {
    id: string;
    nonce?: string;
    flags?: number;
    content?: string;
    url?: string;
    embed?: MjOriginMessage['embeds'][number];
    progress?: number;
    components?: MjOriginMessage['components'];
    originId?: string;
    parentId?: string;
    timestamp?: string;
    custom_id?: string;
    varyRegionImgBase64?: string;
    varyRegionPrompt?: string;
    [key: string]: any;
}
interface MessageCallBack {
    (type: MjMsgType, msg: MjMessage): void;
}
interface MjEvents extends Record<string, MessageCallBack> {
    READY: (res: any) => void;
    WS_OPEN: () => void;
    WS_ERROR: (error: string) => void;
    WS_CLOSE: () => void;
}
type MjMsgType = 'READY' | 'REQUEST_SUCCESS' | 'REQUEST_FAILED' | 'MESSAGE_CREATE' | 'MESSAGE_UPDATE' | 'MESSAGE_DELETE' | 'INTERACTION_CREATE' | 'INTERACTION_SUCCESS' | 'INTERACTION_IFRAME_MODAL_CREATE' | 'INTERACTION_MODAL_CREATE';

declare const Commands: readonly ["ask", "blend", "describe", "fast", "help", "imagine", "info", "prefer", "private", "public", "relax", "settings", "show", "stealth", "shorten", "subscribe"];
type CommandName = (typeof Commands)[number];
declare class MidjourneyCommand {
    opts: MidJourneyFullOptions;
    constructor(opts: MidJourneyFullOptions);
    private commandCaches;
    getCommand(query: CommandName): Promise<ApplicationCommond | undefined>;
}

declare class MidjourneyApi extends MidjourneyCommand {
    opts: MidJourneyFullOptions;
    constructor(opts: MidJourneyFullOptions);
    private interactions;
    private getPayload;
    private inpaint;
    imagine(value: string, cb?: MessageCallBack): Promise<MjMessage | undefined>;
    action(message_id: string, custom_id: string, message_flags: number, cb?: MessageCallBack): Promise<MjMessage | undefined>;
    remixSubmit(id: string, custom_id: string, components: MjOriginMessage['components'], cb?: MessageCallBack): Promise<MjMessage | undefined>;
    varyRegion(customId: string, prompt: string, mask: string, cb?: MessageCallBack): Promise<MjMessage | undefined>;
    info(cb?: MessageCallBack): Promise<MjMessage | undefined>;
    settings(cb?: MessageCallBack): Promise<MjMessage | undefined>;
    fast(cb?: MessageCallBack): Promise<MjMessage | undefined>;
    relax(cb?: MessageCallBack): Promise<MjMessage | undefined>;
}

declare class MidJourney {
    api: MidjourneyApi;
    private opts;
    constructor(opts: MidJourneyOptions);
    init(): Promise<this>;
    get initialize(): boolean;
    get user(): any;
}

declare const defaultOpts: {
    apiBaseUrl: string;
    wsBaseUrl: string;
    imgBaseUrl: string;
    debug: typeof debug;
    fetch: typeof globalThis.fetch;
    skipHeartbeat: boolean;
    discordsaysUrl: string;
};

export { ApplicationCommond, CommandName, Commands, MessageCallBack, MidJourney, MidJourneyFullOptions, MidJourneyOptions, MidjourneyCommand, MidjourneyWs, MjEvents, MjMessage, MjMsgType, MjOriginMessage, defaultOpts };
