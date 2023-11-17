import { Snowyflake, Epoch } from 'snowyflake';
import chalk from 'chalk';
import fetch$1 from 'isomorphic-fetch';
import EventEmitter from 'eventemitter3';
import WebSocket from 'isomorphic-ws';

const Commands = [
  "ask",
  "blend",
  "describe",
  "fast",
  "help",
  "imagine",
  "info",
  "prefer",
  "private",
  "public",
  "relax",
  "settings",
  "show",
  "stealth",
  "shorten",
  "subscribe"
];
class MidjourneyCommand {
  constructor(opts) {
    this.opts = opts;
  }
  commandCaches = {};
  getCommand(query) {
    if (!this.commandCaches[query]) {
      const searchParams = new URLSearchParams({
        type: "1",
        query,
        limit: "1",
        include_applications: "false"
      });
      return this.opts.fetch(
        `${this.opts.apiBaseUrl}/api/v9/channels/${this.opts.channel_id}/application-commands/search?${searchParams}`,
        {
          headers: { authorization: this.opts.token }
        }
      ).then((res) => res.json()).then(({ application_commands }) => {
        if (application_commands.length) {
          this.commandCaches[query] = application_commands[0];
          return this.commandCaches[query];
        } else {
          return Promise.reject("command not found");
        }
      });
    }
    return Promise.resolve(this.commandCaches[query]);
  }
}

const snowflake = new Snowyflake({
  workerId: 0n,
  processId: 0n,
  epoch: Epoch.Discord
});
function debug(...scopes) {
  return (...args) => console.log(
    chalk.red(scopes.map((scope) => `[${scope}]`).join(" ")),
    ...args
  );
}
const nextNonce = () => snowflake.nextId().toString();
const formatComponents = (components) => {
  return components.map((v) => ({
    ...v,
    components: v.components.filter((v2) => v2.custom_id && v2.type === 2)
  })).filter((v) => v.components.length);
};
const matchRegionNonce = (content) => {
  var _a;
  return (_a = content.match(/\*\*regionNonce:\s(\d+?),\s/)) == null ? void 0 : _a[1];
};

class MidjourneyApi extends MidjourneyCommand {
  constructor(opts) {
    super(opts);
    this.opts = opts;
  }
  interactions(payload, cb) {
    const headers = {
      "Content-Type": "application/json",
      Authorization: this.opts.token
    };
    return this.opts.fetch(`${this.opts.apiBaseUrl}/api/v9/interactions`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers
    }).then(
      (res) => res.ok ? cb == null ? void 0 : cb("REQUEST_SUCCESS", res) : cb == null ? void 0 : cb("REQUEST_FAILED", res)
    ).catch((err) => cb == null ? void 0 : cb("REQUEST_FAILED", err));
  }
  getPayload(type, data, others = {}, nonce = nextNonce()) {
    if (!this.opts.session_id) {
      throw new Error("please invoke `init` method before every operate");
    }
    return Object.assign(
      {
        type,
        application_id: "936929561302675456",
        guild_id: this.opts.guild_id,
        channel_id: this.opts.channel_id,
        session_id: this.opts.session_id,
        nonce,
        data
      },
      others
    );
  }
  inpaint(customId, prompt, mask, cb) {
    const headers = {
      "Content-Type": "application/json"
    };
    return this.opts.fetch(`${this.opts.discordsaysUrl}/inpaint/api/submit-job`, {
      method: "POST",
      body: JSON.stringify({
        customId,
        prompt,
        mask: mask.replace(/^data:.+?;base64,/, ""),
        userId: "0",
        username: "0",
        full_prompt: null
      }),
      headers
    }).then(
      (res) => res.ok ? cb == null ? void 0 : cb("REQUEST_SUCCESS", res) : cb == null ? void 0 : cb("REQUEST_FAILED", res)
    ).catch((err) => cb == null ? void 0 : cb("REQUEST_FAILED", err));
  }
  async imagine(value, cb) {
    return this.getCommand("imagine").then((command) => {
      var _a;
      const payload = this.getPayload(
        2,
        Object.assign(command, {
          options: [{ ...command == null ? void 0 : command.options[0], value }]
        })
      );
      return Promise.all([
        this.interactions(payload, cb),
        (_a = this.opts.ws) == null ? void 0 : _a.waitMessage({ nonce: payload.nonce, cb })
      ]).then(([_, res]) => res);
    });
  }
  action(message_id, custom_id, message_flags, cb) {
    var _a;
    const payload = this.getPayload(
      3,
      {
        component_type: 2,
        custom_id
      },
      {
        message_flags,
        message_id
      }
    );
    return Promise.all([
      this.interactions(payload, cb),
      (_a = this.opts.ws) == null ? void 0 : _a.waitMessage({
        nonce: payload.nonce,
        cb,
        parentId: message_id
      })
    ]).then(([_, res]) => res);
  }
  remixSubmit(id, custom_id, components, cb) {
    var _a;
    const payload = this.getPayload(5, {
      id,
      custom_id,
      components
    });
    return Promise.all([
      this.interactions(payload, cb),
      (_a = this.opts.ws) == null ? void 0 : _a.waitMessage({
        nonce: payload.nonce,
        cb
      })
    ]).then(([_, res]) => res);
  }
  varyRegion(customId, prompt, mask, cb) {
    var _a;
    const nonce = nextNonce();
    return Promise.all([
      this.inpaint(customId, `regionNonce: ${nonce}, ${prompt}`, mask, cb),
      (_a = this.opts.ws) == null ? void 0 : _a.waitMessage({ nonce, cb })
    ]).then(([_, msg]) => msg);
  }
  info(cb) {
    return this.getCommand("info").then((command) => {
      var _a;
      const payload = this.getPayload(2, command);
      return Promise.all([
        this.interactions(payload, cb),
        (_a = this.opts.ws) == null ? void 0 : _a.waitMessage({ nonce: payload.nonce, cb })
      ]).then(([_, msg]) => msg);
    });
  }
  settings(cb) {
    return this.getCommand("settings").then((command) => {
      var _a;
      const payload = this.getPayload(2, command);
      return Promise.all([
        this.interactions(payload, cb),
        (_a = this.opts.ws) == null ? void 0 : _a.waitMessage({ nonce: payload.nonce, cb })
      ]).then(([_, msg]) => msg);
    });
  }
  fast(cb) {
    return this.getCommand("fast").then((command) => {
      var _a;
      const payload = this.getPayload(2, command);
      return Promise.all([
        this.interactions(payload, cb),
        (_a = this.opts.ws) == null ? void 0 : _a.waitMessage({ nonce: payload.nonce, cb })
      ]).then(([_, msg]) => msg);
    });
  }
  relax(cb) {
    return this.getCommand("relax").then((command) => {
      var _a;
      const payload = this.getPayload(2, command);
      return Promise.all([
        this.interactions(payload, cb),
        (_a = this.opts.ws) == null ? void 0 : _a.waitMessage({ nonce: payload.nonce, cb })
      ]).then(([_, msg]) => msg);
    });
  }
}

const defaultOpts = {
  apiBaseUrl: "https://discord.com",
  wsBaseUrl: "wss://gateway.discord.gg/?encoding=json&v=9",
  imgBaseUrl: "https://cdn.discordapp.com",
  debug,
  fetch: fetch$1,
  skipHeartbeat: false,
  discordsaysUrl: typeof document === "undefined" ? "https://936929561302675456.discordsays.com" : ""
};

class MidjourneyMsgMap extends Map {
  updateMsgByNonce(id, nonce) {
    let msg = this.get(nonce);
    if (!msg)
      return;
    msg.id = id;
  }
  getMsgById(id) {
    var _a;
    return (_a = Array.from(this.entries()).find(([_, v]) => v.id === id)) == null ? void 0 : _a[1];
  }
  getMsgByparentId(parentId) {
    var _a;
    return (_a = Array.from(this.entries()).find(
      ([_, v]) => v.parentId === parentId && v.progress !== 100
    )) == null ? void 0 : _a[1];
  }
  getMsgByOriginId(originId) {
    var _a;
    return (_a = Array.from(this.entries()).find(
      ([_, v]) => v.originId === originId
    )) == null ? void 0 : _a[1];
  }
  getMsgByContent(content) {
    var _a;
    const RE = /\*\*(.+?)\*\*/;
    const match = content == null ? void 0 : content.match(RE);
    return (_a = Array.from(this.entries()).find(
      ([_, v]) => {
        var _a2, _b;
        return match && match[1] === ((_b = (_a2 = v.content) == null ? void 0 : _a2.match(RE)) == null ? void 0 : _b[1]) && v.progress !== 100;
      }
    )) == null ? void 0 : _a[1];
  }
  getVaryMsgByContent(content) {
    var _a;
    const RE = /\*\*regionNonce:\s(\d+?),\s/;
    const regionNonce = (_a = content == null ? void 0 : content.match(RE)) == null ? void 0 : _a[1];
    return this.get(regionNonce);
  }
}

class MidjourneyWs extends EventEmitter {
  constructor(opts) {
    super();
    this.opts = opts;
    this.wsClient = this.connect();
  }
  wsClient;
  lastSequence = null;
  heartbeatTask = null;
  reconnectionTask = null;
  msgMap = new MidjourneyMsgMap();
  connect() {
    if (!this.opts.wsBaseUrl)
      throw new Error("wsBaseUrl can't be empty");
    const wsClient = new WebSocket(this.opts.wsBaseUrl);
    wsClient.addEventListener("open", () => {
      var _a, _b;
      this.emit("WS_OPEN");
      (_b = (_a = this.opts).debug) == null ? void 0 : _b.call(_a, "MidjourneyWs", "connect")("wsClient is open!");
      if (this.reconnectionTask) {
        clearTimeout(this.reconnectionTask);
        this.reconnectionTask = null;
      }
    });
    wsClient.addEventListener("message", this.message.bind(this));
    wsClient.addEventListener("error", (err) => {
      var _a, _b;
      this.emit("WS_ERROR", err.message);
      (_b = (_a = this.opts).debug) == null ? void 0 : _b.call(
        _a,
        "MidjourneyWs",
        "connect"
      )(`discord wsClient occurred an error: ${err.message}`);
      this.wsClient.close();
    });
    wsClient.addEventListener("close", ({ code, reason }) => {
      var _a, _b;
      this.emit("WS_CLOSE");
      (_b = (_a = this.opts).debug) == null ? void 0 : _b.call(
        _a,
        "MidjourneyWs",
        "connect"
      )(
        `discord wsClient was close, error code: ${code}, error reason: ${reason}`
      );
      if (code === 4004) {
        this.emit("READY", new Error(reason));
      } else {
        this.reconnectionTask = setTimeout(() => {
          var _a2, _b2;
          (_b2 = (_a2 = this.opts).debug) == null ? void 0 : _b2.call(
            _a2,
            "MidjourneyWs",
            "connect"
          )("discord wsClient reconnect...");
          if (this.heartbeatTask && typeof this.heartbeatTask === "number") {
            clearInterval(this.heartbeatTask);
            this.heartbeatTask = null;
          }
          this.wsClient = this.connect.call(this);
        }, 4e3);
      }
    });
    return wsClient;
  }
  auth() {
    this.wsClient.send(
      JSON.stringify({
        op: 2,
        d: {
          token: this.opts.token,
          capabilities: 16381,
          properties: {
            os: "Mac OS X",
            browser: "Chrome",
            device: ""
          },
          compress: false
        }
      })
    );
  }
  heartbeat(interval) {
    var _a, _b;
    const nextInterval = interval * Math.random();
    !this.opts.skipHeartbeat && ((_b = (_a = this.opts).debug) == null ? void 0 : _b.call(
      _a,
      "MidjourneyWs",
      "heartbeat"
    )(`send discord heartbeat after ${Math.round(nextInterval / 1e3)}s`));
    this.heartbeatTask = setTimeout(() => {
      if (this.wsClient.readyState === WebSocket.OPEN) {
        this.wsClient.send(
          JSON.stringify({
            op: 1,
            d: this.lastSequence
          })
        );
        this.heartbeat(interval);
      }
    }, nextInterval);
  }
  message(e) {
    var _a, _b, _c, _d, _e, _f;
    const payload = JSON.parse(e.data);
    const data = payload.d;
    const type = payload.t;
    const seq = payload.s;
    const operate = payload.op;
    seq && (this.lastSequence = seq);
    (_b = (_a = this.opts).debug) == null ? void 0 : _b.call(
      _a,
      "MidjourneyWs",
      "message"
    )(
      [
        { label: "MessageType", value: type },
        { label: "MessageOpCode", value: operate }
      ].filter((v) => !!v.value).map((v) => `${v.label}: ${v.value}`).join(", ")
    );
    if (operate === 10) {
      this.heartbeat(data.heartbeat_interval);
      this.auth();
    }
    if (type === "READY") {
      this.opts.session_id = data.session_id;
      this.opts.user = data.user;
      (_d = (_c = this.opts).debug) == null ? void 0 : _d.call(
        _c,
        "MidjourneyWs",
        "message"
      )("wsClient connect successfully!");
      this.emit("READY", data.user);
    }
    if (type === "MESSAGE_CREATE" || type === "MESSAGE_UPDATE" || type === "MESSAGE_DELETE" || type === "INTERACTION_IFRAME_MODAL_CREATE" || type === "INTERACTION_MODAL_CREATE") {
      this.handleMessage(type, data);
    }
    if (operate === 11) {
      !this.opts.skipHeartbeat && ((_f = (_e = this.opts).debug) == null ? void 0 : _f.call(_e, "MidjourneyWs", "message")("discord heartbeat ack!"));
    }
  }
  handleMessage(type, message) {
    if (message.channel_id !== this.opts.channel_id)
      return;
    if (type === "MESSAGE_CREATE" || type === "INTERACTION_IFRAME_MODAL_CREATE" || type === "INTERACTION_MODAL_CREATE")
      this.handleMessageCreate(type, message);
    else if (type === "MESSAGE_UPDATE")
      this.handleMessageUpdate("MESSAGE_UPDATE", message);
    else
      this.handleMessageDelete(message);
  }
  handleMessageCreate(type, message) {
    let {
      nonce,
      id,
      embeds = [],
      custom_id,
      content,
      attachments = [],
      components
    } = message;
    nonce = nonce || matchRegionNonce(content);
    if (nonce && !attachments.length) {
      this.msgMap.updateMsgByNonce(id, nonce);
      if (embeds[0]) {
        const { color } = embeds[0];
        switch (color) {
          case 16711680:
            this.emitEmbed(id, "MESSAGE_CREATE", embeds[0]);
            break;
        }
      }
      if (type === "INTERACTION_IFRAME_MODAL_CREATE" && custom_id) {
        custom_id = custom_id.split("::")[2];
        let varyRegionPrompt = "";
        return this.opts.fetch(
          `${this.opts.discordsaysUrl}/inpaint/api/get-image-info/0/0/${custom_id}`
        ).then(async (res) => {
          var _a;
          if (res.ok) {
            const json = await res.json();
            varyRegionPrompt = json.prompt;
            const varyRegionImgBase64 = await fetch(
              `${this.opts.discordsaysUrl}/inpaint${(_a = json.image_url) == null ? void 0 : _a.replace(
                /^\./,
                ""
              )}`
            ).then((res2) => res2.blob()).then(
              (blob) => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => e.target && resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              })
            );
            this.emitNonce(nonce, type, {
              custom_id,
              varyRegionPrompt,
              varyRegionImgBase64
            });
          }
        });
      }
      if (type === "INTERACTION_MODAL_CREATE" && custom_id && components.length) {
        this.emitNonce(nonce, type, {
          id,
          custom_id,
          components
        });
      }
    }
    this.handleMessageUpdate("MESSAGE_CREATE", message);
  }
  handleMessageUpdate(type, message) {
    const {
      content,
      interaction = {},
      nonce,
      flags,
      components = [],
      embeds = [],
      id
    } = message;
    if (!nonce) {
      const { name } = interaction;
      const msg = this.msgMap.getMsgById(id);
      if (msg && msg.nonce) {
        switch (name) {
          case "settings":
            this.emitNonce(msg.nonce, type, {
              id,
              flags,
              components: formatComponents(components),
              progress: 100
            });
            return;
          case "info":
            embeds.at(0) && this.emitNonce(msg.nonce, type, {
              id,
              embed: embeds[0],
              progress: 100
            });
            return;
        }
      }
    }
    if (content) {
      this.processingImage(type, message);
    }
  }
  handleMessageDelete({ id }) {
    this.emitNonce(id, "MESSAGE_DELETE", { id }, true);
  }
  processingImage(type, message) {
    var _a, _b;
    const {
      content,
      id,
      attachments = [],
      flags,
      components = [],
      nonce,
      timestamp,
      message_reference = {}
    } = message;
    const { message_id: parentId } = message_reference;
    let msg = this.msgMap.getMsgById(id) || (parentId ? this.msgMap.getMsgByparentId(parentId) : this.msgMap.getMsgByContent(content));
    if (!(msg == null ? void 0 : msg.nonce))
      return;
    let url = (_a = attachments.at(0)) == null ? void 0 : _a.url;
    if (url && this.opts.imgBaseUrl) {
      url = url.replace("https://cdn.discordapp.com", this.opts.imgBaseUrl);
    }
    const progressMatch = (_b = content.match(/\((\d+?)%\)\s\(\w+?\)/)) == null ? void 0 : _b[1];
    const isNewCreateMsg = !nonce && attachments.length && components.length && type === "MESSAGE_CREATE";
    const progress = isNewCreateMsg ? 100 : progressMatch ? parseInt(progressMatch) : 0;
    const originId = msg.id !== id ? msg.id : void 0;
    const mjMsg = JSON.parse(
      JSON.stringify({
        id,
        url,
        originId,
        content: content.replace(/^\*\*regionNonce:\s\d+?,\s/, "**"),
        parentId,
        flags,
        components: formatComponents(components),
        progress,
        timestamp
      })
    );
    this.emitNonce(msg.nonce, type, mjMsg);
  }
  emitNonce(idOrNonce, type, msg, isDel = false) {
    const emitMsg = this.msgMap.get(idOrNonce) || this.msgMap.getMsgById(idOrNonce) || this.msgMap.getMsgByOriginId(idOrNonce);
    emitMsg && emitMsg.nonce && this.emit(
      emitMsg.nonce,
      type,
      isDel ? msg : Object.assign({}, emitMsg, msg)
    );
  }
  emitEmbed(id, type, embed) {
    const msg = this.msgMap.getMsgById(id);
    if (!msg || !msg.nonce)
      return;
    msg.embed = embed;
    this.emitNonce(msg.nonce, type, msg);
  }
  waitReady() {
    return new Promise((s, j) => {
      this.once("READY", (res) => res instanceof Error ? j(res) : s(res));
    });
  }
  waitMessage({
    nonce,
    parentId,
    cb
  }) {
    this.msgMap.set(nonce, { id: "", nonce });
    const parentMsg = parentId && this.msgMap.getMsgById(parentId);
    return new Promise((s, j) => {
      parentMsg && parentMsg.nonce && this.once(parentMsg.nonce, (type, msg) => {
        cb == null ? void 0 : cb(type, msg);
        this.off(parentMsg.nonce);
      });
      this.on(nonce, (type, msg) => {
        cb == null ? void 0 : cb(type, msg);
        if (type === "MESSAGE_DELETE" && msg.id) {
          const final = this.msgMap.getMsgByOriginId(msg.id);
          final && this.off(nonce) && s(final);
          return;
        }
        if (type === "INTERACTION_IFRAME_MODAL_CREATE" || type === "INTERACTION_MODAL_CREATE") {
          this.off(nonce);
          return;
        }
        this.msgMap.set(nonce, msg);
        if (msg.error) {
          this.off(nonce);
          j(msg.error);
          return;
        }
      });
    });
  }
}

class MidJourney {
  api;
  opts;
  constructor(opts) {
    if (!opts.token || !opts.channel_id || !opts.guild_id) {
      throw new Error("`token`\u3001`channel_id` and `guild_id` are required");
    }
    this.opts = Object.assign({}, defaultOpts, opts);
    if (!this.opts.apiBaseUrl)
      this.opts.apiBaseUrl = defaultOpts.apiBaseUrl;
    if (!this.opts.wsBaseUrl)
      this.opts.wsBaseUrl = defaultOpts.wsBaseUrl;
    if (!this.opts.imgBaseUrl)
      this.opts.imgBaseUrl = defaultOpts.imgBaseUrl;
    this.api = new MidjourneyApi(this.opts);
  }
  async init() {
    this.opts.ws = new MidjourneyWs(this.opts);
    await this.opts.ws.waitReady();
    return this;
  }
  get initialize() {
    var _a;
    return ((_a = this.opts.ws) == null ? void 0 : _a.wsClient.readyState) === 1;
  }
  get user() {
    return this.opts.user;
  }
}

export { Commands, MidJourney, MidjourneyCommand, MidjourneyWs, defaultOpts };
