# Nexus Party – Watch Together App

A beautiful, Discord-inspired watch party web app.

## Features

- **Create / Join rooms** with short invite codes
- **Paste any video link**: YouTube, Vimeo, Twitch, direct MP4/WebM, etc.
- **Host-controlled playback** (play / pause / seek / force-sync)
- **Real-time chat** with emoji reactions
- **Random facts** button (Science, Arts, Earth, Animals, Movies, Space & more)
- **Discord-style UI**: sidebar channels, member list with crowns, voice bar
- **Audio + Video calls** via WebRTC (PeerJS) – works between browsers on the same network or with a free PeerServer
- Attractive dark theme with purple accents and smooth animations

## How to run

1. Download / unzip the project.
2. Open `index.html` in a modern browser (Chrome, Edge, Firefox, Brave recommended).
3. **Or** serve it with any static server for best results:

```bash
# Python
python -m http.server 8080

# Node
npx serve .
```

Then open `http://localhost:8080`.

## Testing multi-user

- Open the same room code in **two different browser tabs** (or two browsers).
- One person creates the room → becomes Host.
- Others join with the code.
- Host pastes a video link and controls playback.
- Chat, reactions, and facts work across tabs via `BroadcastChannel`.
- Voice/Video works when both users click **Join Voice** (grant mic/camera permissions).

> **Note**: `BroadcastChannel` only works between tabs/windows of the **same browser origin**.  
> For true internet-wide multiplayer you need a signaling + realtime backend (Firebase, Supabase, Socket.io, etc.). The current version is a fully working local/demo version that already includes the complete UI and WebRTC calls.

## Voice / Video notes

- Uses **PeerJS** (peer-to-peer WebRTC).
- Default PeerJS cloud broker is used (free).
- For production you should run your own PeerServer or switch to a more robust SFU (LiveKit, Daily, etc.).

## File structure

```
watchparty/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js          # Main application logic
│   └── facts.js        # Random facts database
└── README.md
```

## Future ideas (easy to extend)

- Firebase / Supabase for true cross-device rooms
- YouTube IFrame API for precise control of YouTube videos
- Screen sharing
- Playlist queue
- Custom room themes / avatars
- Persistent user accounts

Enjoy your party!  
Made with 💜 for Grok users.
