/* ============================================================
   NEXUS PARTY – Watch Together App
   Features: Rooms, synced playback, external links, chat,
   reactions, random facts, Discord-style UI, WebRTC voice/video
   ============================================================ */

(() => {
  // -------------------- State --------------------
  const state = {
    username: "",
    roomCode: "",
    partyName: "",
    isHost: false,
    members: [],
    videoUrl: "",
    videoType: null, // 'youtube' | 'vimeo' | 'direct' | null
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    peer: null,
    myPeerId: null,
    localStream: null,
    calls: {},          // peerId -> MediaConnection
    inVoice: false,
    muted: false,
    videoEnabled: false,
    channel: null,      // BroadcastChannel
  };

  // -------------------- DOM --------------------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const landing = $("#landing");
  const app = $("#app");
  const chatMessages = $("#chat-messages");
  const memberList = $("#member-list");
  const videoPlaceholder = $("#video-placeholder");
  const playerWrapper = $("#player-wrapper");
  const seekBar = $("#seek-bar");
  const timeDisplay = $("#time-display");
  const hostBadge = $("#host-badge");

  // -------------------- Helpers --------------------
  function generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  function avatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 55%)`;
  }

  function initials(name) {
    return name.slice(0, 2).toUpperCase();
  }

  function formatTime(s) {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  function toast(msg, type = "info") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = msg;
    $("#toast-container").appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  function nowTime() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // -------------------- BroadcastChannel (local multi-tab sync) --------------------
  function initChannel(roomCode) {
    if (state.channel) state.channel.close();
    state.channel = new BroadcastChannel(`nexus-party-${roomCode}`);
    state.channel.onmessage = (e) => handleRemoteMessage(e.data);
  }

  function broadcast(type, payload = {}) {
    if (!state.channel) return;
    state.channel.postMessage({
      type,
      from: state.username,
      peerId: state.myPeerId,
      isHost: state.isHost,
      ts: Date.now(),
      ...payload,
    });
  }

  function handleRemoteMessage(msg) {
    if (msg.from === state.username) return;

    switch (msg.type) {
      case "join":
        addMember(msg.from, msg.peerId, msg.isHost);
        addSystemMessage(`${msg.from} joined the party`);
        // Reply with current state so new joiner catches up
        if (state.isHost) {
          broadcast("state-sync", {
            videoUrl: state.videoUrl,
            isPlaying: state.isPlaying,
            currentTime: getCurrentPlaybackTime(),
            members: state.members,
            partyName: state.partyName,
          });
        }
        break;

      case "leave":
        removeMember(msg.from);
        addSystemMessage(`${msg.from} left the party`);
        break;

      case "chat":
        addChatMessage(msg.from, msg.text, false);
        break;

      case "reaction":
        addChatMessage(msg.from, msg.emoji, false, true);
        break;

      case "fact":
        addFactMessage(msg.from, msg.category, msg.fact);
        break;

      case "video-load":
        if (!state.isHost) loadVideo(msg.url, false);
        break;

      case "play":
        if (!state.isHost) {
          state.isPlaying = true;
          setPlaying(true, msg.currentTime);
        }
        break;

      case "pause":
        if (!state.isHost) {
          state.isPlaying = false;
          setPlaying(false, msg.currentTime);
        }
        break;

      case "seek":
        if (!state.isHost) seekTo(msg.currentTime);
        break;

      case "sync":
        if (!state.isHost) {
          seekTo(msg.currentTime);
          setPlaying(msg.isPlaying, msg.currentTime);
        }
        break;

      case "state-sync":
        // New joiner receives full state from host
        if (msg.partyName) {
          state.partyName = msg.partyName;
          $("#party-name").textContent = msg.partyName;
        }
        if (msg.videoUrl && msg.videoUrl !== state.videoUrl) {
          loadVideo(msg.videoUrl, false);
        }
        if (typeof msg.currentTime === "number") {
          setTimeout(() => {
            seekTo(msg.currentTime);
            setPlaying(msg.isPlaying, msg.currentTime);
          }, 800);
        }
        if (msg.members) {
          msg.members.forEach((m) => addMember(m.name, m.peerId, m.isHost));
        }
        break;

      case "host-transfer":
        if (msg.newHost === state.username) {
          state.isHost = true;
          hostBadge.style.display = "flex";
          toast("You are now the host!", "success");
        }
        updateMemberList();
        break;

      case "voice-join":
        // another peer is in voice – we can call them if we are also in voice
        if (state.inVoice && msg.peerId && msg.peerId !== state.myPeerId) {
          callPeer(msg.peerId);
        }
        break;
    }
  }

  // -------------------- Members --------------------
  function addMember(name, peerId, isHost = false) {
    if (state.members.find((m) => m.name === name)) return;
    state.members.push({ name, peerId, isHost });
    updateMemberList();
  }

  function removeMember(name) {
    state.members = state.members.filter((m) => m.name !== name);
    updateMemberList();
  }

  function updateMemberList() {
    memberList.innerHTML = "";
    const sorted = [...state.members].sort((a, b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0));
    sorted.forEach((m) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="member-avatar ${m.isHost ? "host" : ""}" style="background:${avatarColor(m.name)}">
          ${initials(m.name)}
        </div>
        <span class="member-name">${m.name}</span>
        ${m.isHost ? '<i class="fas fa-crown crown"></i>' : ""}
      `;
      memberList.appendChild(li);
    });
    $("#member-count").textContent = `(${state.members.length})`;
  }

  // -------------------- Chat --------------------
  function addChatMessage(author, text, isMe, isReaction = false) {
    const div = document.createElement("div");
    div.className = "message";
    const color = avatarColor(author);
    div.innerHTML = `
      <div class="msg-avatar" style="background:${color}">${initials(author)}</div>
      <div class="msg-body">
        <div class="msg-header">
          <span class="msg-author">${author}${isMe ? " (you)" : ""}</span>
          <span class="msg-time">${nowTime()}</span>
        </div>
        <div class="msg-text ${isReaction ? "reaction-msg" : ""}">${escapeHtml(text)}</div>
      </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addSystemMessage(text) {
    const div = document.createElement("div");
    div.className = "message";
    div.innerHTML = `<div class="msg-body"><div class="msg-text system">${escapeHtml(text)}</div></div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addFactMessage(author, category, fact) {
    const div = document.createElement("div");
    div.className = "message";
    const color = avatarColor(author);
    div.innerHTML = `
      <div class="msg-avatar" style="background:${color}">${initials(author)}</div>
      <div class="msg-body">
        <div class="msg-header">
          <span class="msg-author">${author}</span>
          <span class="msg-time">${nowTime()}</span>
        </div>
        <div class="msg-text fact">
          <strong>💡 ${category.toUpperCase()} FACT</strong><br>${escapeHtml(fact)}
        </div>
      </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function sendChat() {
    const input = $("#chat-input");
    const text = input.value.trim();
    if (!text) return;
    addChatMessage(state.username, text, true);
    broadcast("chat", { text });
    input.value = "";
  }

  function sendReaction(emoji) {
    addChatMessage(state.username, emoji, true, true);
    broadcast("reaction", { emoji });
  }

  function sendRandomFact() {
    const { category, fact } = getRandomFact();
    addFactMessage(state.username, category, fact);
    broadcast("fact", { category, fact });
  }

  // -------------------- Video Detection & Loading --------------------
  function detectVideoType(url) {
    if (!url) return null;
    const u = url.toLowerCase();
    if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
    if (u.includes("vimeo.com")) return "vimeo";
    if (u.includes("twitch.tv")) return "twitch";
    if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(u) || u.startsWith("blob:")) return "direct";
    // try as direct anyway
    return "direct";
  }

  function extractYouTubeId(url) {
    const reg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const m = url.match(reg);
    return m ? m[1] : null;
  }

  function extractVimeoId(url) {
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? m[1] : null;
  }

  function loadVideo(url, broadcastIt = true) {
    if (!url) return;
    state.videoUrl = url;
    state.videoType = detectVideoType(url);
    videoPlaceholder.classList.add("hidden");
    playerWrapper.classList.remove("hidden");
    playerWrapper.innerHTML = "";

    if (state.videoType === "youtube") {
      const id = extractYouTubeId(url);
      if (!id) {
        toast("Invalid YouTube URL", "error");
        return;
      }
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube.com/embed/${id}?enablejsapi=1&rel=0&modestbranding=1`;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;
      iframe.id = "yt-player";
      playerWrapper.appendChild(iframe);
      // Note: full YouTube API control needs extra script; basic embed works for watching
    } else if (state.videoType === "vimeo") {
      const id = extractVimeoId(url);
      if (!id) {
        toast("Invalid Vimeo URL", "error");
        return;
      }
      const iframe = document.createElement("iframe");
      iframe.src = `https://player.vimeo.com/video/${id}`;
      iframe.allow = "autoplay; fullscreen; picture-in-picture";
      iframe.allowFullscreen = true;
      playerWrapper.appendChild(iframe);
    } else if (state.videoType === "twitch") {
      // simple embed
      const channel = url.split("/").pop();
      const iframe = document.createElement("iframe");
      iframe.src = `https://player.twitch.tv/?channel=${channel}&parent=${location.hostname || "localhost"}`;
      iframe.allowFullscreen = true;
      playerWrapper.appendChild(iframe);
    } else {
      // direct video
      const video = document.createElement("video");
      video.id = "direct-player";
      video.src = url;
      video.controls = false;
      video.playsInline = true;
      playerWrapper.appendChild(video);

      video.addEventListener("loadedmetadata", () => {
        state.duration = video.duration;
        seekBar.max = video.duration;
        updateTimeDisplay();
      });
      video.addEventListener("timeupdate", () => {
        if (state.isHost) {
          state.currentTime = video.currentTime;
          seekBar.value = video.currentTime;
          updateTimeDisplay();
        }
      });
      video.addEventListener("ended", () => {
        state.isPlaying = false;
        updatePlayButton();
      });
    }

    if (broadcastIt && state.isHost) {
      broadcast("video-load", { url });
    }
    toast("Video loaded", "success");
  }

  function getDirectVideo() {
    return $("#direct-player");
  }

  function getCurrentPlaybackTime() {
    const v = getDirectVideo();
    if (v) return v.currentTime || 0;
    return state.currentTime;
  }

  function setPlaying(playing, time = null) {
    state.isPlaying = playing;
    const v = getDirectVideo();
    if (v) {
      if (time !== null) v.currentTime = time;
      if (playing) v.play().catch(() => {});
      else v.pause();
    }
    updatePlayButton();
  }

  function seekTo(time) {
    state.currentTime = time;
    const v = getDirectVideo();
    if (v) v.currentTime = time;
    seekBar.value = time;
    updateTimeDisplay();
  }

  function updatePlayButton() {
    const icon = $("#btn-playpause i");
    icon.className = state.isPlaying ? "fas fa-pause" : "fas fa-play";
  }

  function updateTimeDisplay() {
    const cur = getCurrentPlaybackTime();
    timeDisplay.textContent = `${formatTime(cur)} / ${formatTime(state.duration)}`;
  }

  // -------------------- Voice / Video (PeerJS) --------------------
  function initPeer() {
    return new Promise((resolve) => {
      const peer = new Peer(undefined, {
        debug: 1,
      });
      peer.on("open", (id) => {
        state.myPeerId = id;
        state.peer = peer;
        console.log("My Peer ID:", id);
        resolve(id);
      });
      peer.on("call", (call) => {
        // Incoming call
        if (state.localStream) {
          call.answer(state.localStream);
          setupCall(call);
        } else {
          call.answer(); // answer without stream if not ready
          setupCall(call);
        }
      });
      peer.on("error", (err) => {
        console.warn("Peer error:", err);
        toast("Voice connection issue: " + err.type, "error");
      });
    });
  }

  function setupCall(call) {
    const peerId = call.peer;
    state.calls[peerId] = call;

    call.on("stream", (remoteStream) => {
      // Create audio element for remote audio
      let audio = document.getElementById(`remote-audio-${peerId}`);
      if (!audio) {
        audio = document.createElement("audio");
        audio.id = `remote-audio-${peerId}`;
        audio.autoplay = true;
        document.body.appendChild(audio);
      }
      audio.srcObject = remoteStream;

      // If video track exists, show it
      if (remoteStream.getVideoTracks().length > 0) {
        let vid = document.getElementById(`remote-video-${peerId}`);
        if (!vid) {
          vid = document.createElement("video");
          vid.id = `remote-video-${peerId}`;
          vid.autoplay = true;
          vid.playsInline = true;
          vid.style.cssText = "width:120px;height:90px;border-radius:8px;margin:4px;object-fit:cover;border:2px solid var(--accent)";
          $(".voice-bar").appendChild(vid);
        }
        vid.srcObject = remoteStream;
      }
    });

    call.on("close", () => {
      delete state.calls[peerId];
      const a = document.getElementById(`remote-audio-${peerId}`);
      if (a) a.remove();
      const v = document.getElementById(`remote-video-${peerId}`);
      if (v) v.remove();
    });
  }

  function callPeer(peerId) {
    if (!state.peer || !state.localStream || state.calls[peerId]) return;
    const call = state.peer.call(peerId, state.localStream);
    setupCall(call);
  }

  async function joinVoice() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: state.videoEnabled,
      });
      state.localStream = stream;
      state.inVoice = true;

      const localVideo = $("#local-video");
      if (state.videoEnabled) {
        localVideo.srcObject = stream;
        $("#local-preview").classList.remove("hidden");
      }

      $("#btn-join-voice").innerHTML = `<i class="fas fa-phone-slash"></i> Leave Voice`;
      $("#btn-join-voice").classList.add("active");
      $("#btn-mute").disabled = false;
      $("#btn-deafen").disabled = false;
      $("#btn-video-call").disabled = false;
      $("#voice-status-text").innerHTML = `<i class="fas fa-microphone"></i> Connected to voice`;

      // Announce so others can call us
      broadcast("voice-join", { peerId: state.myPeerId });

      // Call existing members who are already in voice (they will have sent voice-join earlier)
      state.members.forEach((m) => {
        if (m.peerId && m.peerId !== state.myPeerId) {
          callPeer(m.peerId);
        }
      });

      toast("Joined voice channel", "success");
    } catch (err) {
      console.error(err);
      toast("Microphone permission denied or unavailable", "error");
    }
  }

  function leaveVoice() {
    if (state.localStream) {
      state.localStream.getTracks().forEach((t) => t.stop());
      state.localStream = null;
    }
    Object.values(state.calls).forEach((c) => c.close());
    state.calls = {};
    state.inVoice = false;
    state.muted = false;
    state.videoEnabled = false;

    $("#local-preview").classList.add("hidden");
    $("#btn-join-voice").innerHTML = `<i class="fas fa-phone"></i> Join Voice`;
    $("#btn-join-voice").classList.remove("active");
    $("#btn-mute").disabled = true;
    $("#btn-deafen").disabled = true;
    $("#btn-video-call").disabled = true;
    $("#btn-mute").classList.remove("muted");
    $("#voice-status-text").innerHTML = `<i class="fas fa-microphone-slash"></i> Voice disconnected`;

    // remove remote media elements
    $$("[id^=remote-audio-], [id^=remote-video-]").forEach((el) => el.remove());
    toast("Left voice channel", "info");
  }

  function toggleMute() {
    if (!state.localStream) return;
    state.muted = !state.muted;
    state.localStream.getAudioTracks().forEach((t) => (t.enabled = !state.muted));
    $("#btn-mute").classList.toggle("muted", state.muted);
    $("#btn-mute").innerHTML = state.muted
      ? `<i class="fas fa-microphone-slash"></i>`
      : `<i class="fas fa-microphone"></i>`;
  }

  async function toggleVideo() {
    if (!state.inVoice) return;
    state.videoEnabled = !state.videoEnabled;

    if (state.videoEnabled) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        // replace tracks
        const oldAudio = state.localStream.getAudioTracks()[0];
        state.localStream.getTracks().forEach((t) => t.stop());
        state.localStream = newStream;
        if (state.muted && oldAudio) {
          newStream.getAudioTracks().forEach((t) => (t.enabled = false));
        }
        $("#local-video").srcObject = newStream;
        $("#local-preview").classList.remove("hidden");

        // renegotiate existing calls by replacing tracks is complex;
        // for demo we just update local preview. Full renegotiation would need more code.
        Object.values(state.calls).forEach((call) => {
          // simple approach: close & re-call
          const peerId = call.peer;
          call.close();
          callPeer(peerId);
        });
      } catch (e) {
        toast("Camera permission denied", "error");
        state.videoEnabled = false;
      }
    } else {
      state.localStream.getVideoTracks().forEach((t) => t.stop());
      $("#local-preview").classList.add("hidden");
    }
    $("#btn-video-call").classList.toggle("active", state.videoEnabled);
  }

  // -------------------- Room Lifecycle --------------------
  async function enterRoom(isCreating) {
    const nameInput = isCreating ? $("#username-create") : $("#username-join");
    const username = nameInput.value.trim() || "Guest" + Math.floor(Math.random() * 900 + 100);
    state.username = username;

    if (isCreating) {
      state.roomCode = generateRoomCode();
      state.partyName = $("#room-name").value.trim() || "Watch Party";
      state.isHost = true;
    } else {
      state.roomCode = $("#room-code").value.trim().toUpperCase();
      if (!state.roomCode || state.roomCode.length < 4) {
        toast("Enter a valid room code", "error");
        return;
      }
      state.partyName = "Watch Party";
      state.isHost = false;
    }

    // UI
    landing.classList.add("hidden");
    app.classList.remove("hidden");
    $("#room-display").textContent = state.roomCode;
    $("#party-name").textContent = state.partyName;
    $("#my-name").textContent = state.username;
    $("#my-avatar").textContent = initials(state.username);
    $("#my-avatar").style.background = avatarColor(state.username);

    if (state.isHost) hostBadge.style.display = "flex";

    // Members
    state.members = [{ name: state.username, peerId: null, isHost: state.isHost }];
    updateMemberList();

    // Channel
    initChannel(state.roomCode);

    // PeerJS
    try {
      await initPeer();
      // update our member entry with peerId
      const me = state.members.find((m) => m.name === state.username);
      if (me) me.peerId = state.myPeerId;
    } catch (e) {
      console.warn("PeerJS init failed", e);
    }

    // Announce join
    broadcast("join", {});
    addSystemMessage(`You joined ${state.partyName}`);
    if (state.isHost) {
      addSystemMessage("You are the host. Paste a video link to begin.");
    } else {
      addSystemMessage("Waiting for host to start the video…");
    }

    toast(`Joined room ${state.roomCode}`, "success");
  }

  function leaveRoom() {
    broadcast("leave", {});
    if (state.inVoice) leaveVoice();
    if (state.channel) state.channel.close();
    if (state.peer) state.peer.destroy();

    // reset
    state.members = [];
    state.videoUrl = "";
    state.isPlaying = false;
    playerWrapper.innerHTML = "";
    playerWrapper.classList.add("hidden");
    videoPlaceholder.classList.remove("hidden");
    chatMessages.innerHTML = "";

    app.classList.add("hidden");
    landing.classList.remove("hidden");
  }

  // -------------------- Event Listeners --------------------
  function bindEvents() {
    // Tabs
    $$(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        $$(".tab").forEach((t) => t.classList.remove("active"));
        $$(".panel").forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        $(`#${tab.dataset.tab}-panel`).classList.add("active");
      });
    });

    $("#btn-create").addEventListener("click", () => enterRoom(true));
    $("#btn-join").addEventListener("click", () => enterRoom(false));

    // Enter key on inputs
    $("#username-create").addEventListener("keydown", (e) => e.key === "Enter" && enterRoom(true));
    $("#room-name").addEventListener("keydown", (e) => e.key === "Enter" && enterRoom(true));
    $("#username-join").addEventListener("keydown", (e) => e.key === "Enter" && enterRoom(false));
    $("#room-code").addEventListener("keydown", (e) => e.key === "Enter" && enterRoom(false));

    $("#btn-leave").addEventListener("click", leaveRoom);

    $("#btn-copy-code").addEventListener("click", () => {
      navigator.clipboard.writeText(state.roomCode).then(() => toast("Room code copied!", "success"));
    });

    // Video
    $("#btn-load-video").addEventListener("click", () => {
      const url = $("#video-url").value.trim();
      if (!url) return toast("Paste a video URL first", "error");
      if (!state.isHost) return toast("Only the host can change the video", "error");
      loadVideo(url, true);
    });

    $("#video-url").addEventListener("keydown", (e) => {
      if (e.key === "Enter") $("#btn-load-video").click();
    });

    $("#btn-playpause").addEventListener("click", () => {
      if (!state.isHost) return toast("Only host controls playback", "error");
      const newState = !state.isPlaying;
      const t = getCurrentPlaybackTime();
      setPlaying(newState, t);
      broadcast(newState ? "play" : "pause", { currentTime: t });
    });

    seekBar.addEventListener("input", () => {
      if (!state.isHost) return;
      const t = parseFloat(seekBar.value);
      seekTo(t);
    });

    seekBar.addEventListener("change", () => {
      if (!state.isHost) return;
      const t = parseFloat(seekBar.value);
      broadcast("seek", { currentTime: t });
    });

    $("#btn-sync").addEventListener("click", () => {
      if (!state.isHost) return toast("Only host can force sync", "error");
      const t = getCurrentPlaybackTime();
      broadcast("sync", { currentTime: t, isPlaying: state.isPlaying });
      toast("Forced sync sent to everyone", "success");
    });

    $("#btn-fullscreen").addEventListener("click", () => {
      const container = $("#video-container");
      if (!document.fullscreenElement) container.requestFullscreen?.();
      else document.exitFullscreen?.();
    });

    // Chat
    $("#btn-send").addEventListener("click", sendChat);
    $("#chat-input").addEventListener("keydown", (e) => e.key === "Enter" && sendChat());

    $$(".react-btn").forEach((btn) => {
      btn.addEventListener("click", () => sendReaction(btn.dataset.emoji));
    });

    $("#btn-random-fact").addEventListener("click", sendRandomFact);

    // Voice
    $("#btn-join-voice").addEventListener("click", () => {
      if (state.inVoice) leaveVoice();
      else joinVoice();
    });
    $("#btn-mute").addEventListener("click", toggleMute);
    $("#btn-video-call").addEventListener("click", toggleVideo);

    // Channels (visual only for now)
    $$(".channel").forEach((ch) => {
      ch.addEventListener("click", () => {
        $$(".channel").forEach((c) => c.classList.remove("active"));
        ch.classList.add("active");
        if (ch.dataset.channel === "voice" && !state.inVoice) {
          toast("Click “Join Voice” in the bottom bar to enter the voice channel", "info");
        }
      });
    });
  }

  // -------------------- Init --------------------
  bindEvents();
  console.log("%cNexus Party ready", "color:#7c5cfc;font-weight:bold");
})();
