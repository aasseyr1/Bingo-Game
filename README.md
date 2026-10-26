# Reflection Bingo Live

A real-time multiplayer weekly reflection bingo game for approximately 30–40+ participants.

## What it does
- Host creates a room and gets a room code + shareable link.
- Participants join with their names.
- Each participant controls only their own 5×5 reflection bingo board.
- Everyone can see a live leaderboard.
- Host can see everyone who is currently connected and how many squares each person selected.
- Leaderboard highlights the person with the most selected squares.
- Bingo lines and full house are detected automatically.
- Host can reset everyone's boards.
- The free center square is always selected.

## Run locally
1. Install Node.js 18+.
2. Open a terminal in this folder.
3. Run:
   npm install
4. Run:
   npm start
5. Open:
   http://localhost:3000

Important: if participants are on different computers, localhost will not work for them. You need to deploy the app publicly.

## Easiest deployment options
This project can be deployed as a normal Node.js web service on Render, Railway, Fly.io, or a similar host.

Typical settings:
- Build command: `npm install`
- Start command: `npm start`
- Port: automatically uses the host's `PORT` environment variable.

## Important persistence note
Room data is currently stored in server memory. That is perfect for a live 30-minute reflection session, but:
- restarting the server clears the room;
- if the host disconnects, the room closes.

For a one-off or weekly live session, this keeps setup simple.
If you want permanent session history, reusable rooms, attendance exports, or analytics across weeks, connect the app to a database such as Supabase or Firebase.
