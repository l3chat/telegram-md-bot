import {
  emptyMediaSession,
  addMediaToSession,
  setPendingMarkdown,
  touchSession,
} from "./media.js";
import { finalizeAlbumDraft } from "./album-finalizer.js";
import { trackStat } from "./stats-store.js";

const TTL_MS = 24 * 60 * 60 * 1000;
const ALBUM_QUIET_MS = 2000;

export class DraftSession {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async read() {
    const stored = await this.state.storage.get("session");
    if (!stored || !Array.isArray(stored.items)) return emptyMediaSession();
    return {
      ...emptyMediaSession(),
      ...stored,
      items: stored.items,
    };
  }

  async write(session) {
    await this.state.storage.put("session", session);
    await this.state.storage.setAlarm(Date.now() + TTL_MS);
    return session;
  }

  async clear() {
    await this.state.storage.deleteAll();
    return emptyMediaSession();
  }

  async scheduleAlbum(meta) {
    await this.state.storage.put("album_finalize", meta);
    await this.state.storage.setAlarm(Date.now() + ALBUM_QUIET_MS);
    return { ok: true };
  }

  async alarm() {
    const pending = await this.state.storage.get("album_finalize");

    if (pending) {
      const session = await this.read();
      const sameRevision =
        pending.revision == null || session.revision === pending.revision;
      const sameGroup =
        !pending.media_group_id ||
        session.media_group_id === pending.media_group_id;

      if (session.markdown && sameRevision && sameGroup) {
        try {
          await finalizeAlbumDraft(
            this.env.BOT_TOKEN,
            pending.chat_id,
            session,
            this.env.STATS,
            pending.user_id || null
          );
          await this.state.storage.deleteAll();
          return;
        } catch (error) {
          console.error("Automatic album finalize failed", error);
          await trackStat(this.env.STATS, "errors");
          await this.state.storage.put("album_error", {
            message: String(error?.message || error).slice(0, 1200),
            at: new Date().toISOString(),
          });
          await this.state.storage.delete("album_finalize");
          await this.state.storage.setAlarm(Date.now() + TTL_MS);
          return;
        }
      }

      await this.state.storage.delete("album_finalize");
      await this.state.storage.setAlarm(Date.now() + TTL_MS);
      return;
    }

    await this.state.storage.deleteAll();
  }

  async fetch(request) {
    const url = new URL(request.url);
    const action = url.pathname.replace(/^\/+/, "");
    const body =
      request.method === "POST"
        ? await request.json().catch(() => ({}))
        : {};

    if (action === "get") {
      return Response.json(await this.read());
    }

    if (action === "clear") {
      return Response.json(await this.clear());
    }

    if (action === "add-media") {
      const current = await this.read();
      const next = addMediaToSession(current, body.item || {});
      return Response.json(await this.write(next));
    }

    if (action === "set-markdown") {
      const current = await this.read();
      const next = setPendingMarkdown(
        current,
        body.markdown || "",
        body.message || {}
      );
      return Response.json(await this.write(next));
    }

    if (action === "touch") {
      const current = await this.read();
      const next = touchSession(current, body.message || {});
      return Response.json(await this.write(next));
    }

    if (action === "schedule-album") {
      return Response.json(await this.scheduleAlbum(body));
    }

    if (action === "replace") {
      const next = {
        ...emptyMediaSession(),
        ...(body.session || {}),
        items: Array.isArray(body.session?.items)
          ? body.session.items
          : [],
      };
      return Response.json(await this.write(next));
    }

    return new Response("Not found", { status: 404 });
  }
}

function draftSessionName(message) {
  const chatId = message?.chat?.id;
  const userId = message?.from?.id || chatId;
  return String(chatId) + ":" + String(userId);
}

function draftSessionStub(namespace, message) {
  if (!namespace) return null;
  const id = namespace.idFromName(draftSessionName(message));
  return namespace.get(id);
}

async function callDraftSession(stub, action, payload) {
  if (!stub) throw new Error("DRAFT_SESSIONS binding is not configured");
  const response = await stub.fetch("https://draft-session/" + action, {
    method: payload === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(
      "DraftSession " + action + " failed: HTTP " + response.status
    );
  }
  return response.json();
}

async function getDraftSession(stub) {
  return callDraftSession(stub, "get");
}

async function clearDraftSession(stub) {
  return callDraftSession(stub, "clear", {});
}

async function addDraftMedia(stub, item) {
  return callDraftSession(stub, "add-media", { item });
}

async function setDraftMarkdown(stub, markdown, message) {
  return callDraftSession(stub, "set-markdown", { markdown, message });
}

async function touchDraftSession(stub, message) {
  return callDraftSession(stub, "touch", { message });
}

async function replaceDraftSession(stub, session) {
  return callDraftSession(stub, "replace", { session });
}

async function scheduleAlbumFinalize(stub, meta) {
  return callDraftSession(stub, "schedule-album", meta);
}

export {
  TTL_MS,
  ALBUM_QUIET_MS,
  draftSessionName,
  draftSessionStub,
  getDraftSession,
  clearDraftSession,
  addDraftMedia,
  setDraftMarkdown,
  touchDraftSession,
  replaceDraftSession,
  scheduleAlbumFinalize,
};
