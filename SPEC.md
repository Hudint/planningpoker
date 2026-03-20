# Specification: Planning Poker App (Next.js)

## 1. Overview

A browser-based real-time app for **Planning Poker** (also: Scrum Poker), enabling distributed teams to estimate effort collaboratively. No login, no story management — as **lightweight as possible**. The team discusses stories externally (Jira, meeting, etc.) and uses this app purely for the estimation itself.

---

## 2. Core Features

### 2.1 Rooms
- User clicks **"New Room"** → app generates a **UUID v4** as the room ID
- User is immediately redirected to `/room/<uuid>` and assigned the **Moderator** role
- The **room link** (`/room/<uuid>`) is displayed prominently with a copy button for sharing
- Rooms are **temporary** — deleted from memory after 24h of inactivity
- No password protection (security through obscurity of the UUID is sufficient for this use case)

### 2.2 Participants
- Any user opening `/room/<uuid>` enters a **display name** → immediately joined
- Identity is stored as a **JWT** in `localStorage` (persists across page reloads)
- Roles:
  - **Moderator** – first person in the room; reveals cards, resets rounds, sets timer, changes card set, transfers role manually
  - **Voter** – all other participants; estimate and see results
  - **Observer** – selects "watch only" on join; does not vote

> **Moderator goes offline without handing over**: Any voter sees a **"Claim Moderator"** button — the first person to click gets the role (a new JWT with `role: 'moderator'` is issued).

### 2.3 Voting
- Supported card sets (**changeable at any time by the moderator**):
  - **Fibonacci**: 0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?, ☕
  - **T-Shirt**: XS, S, M, L, XL, XXL, ?
  - **Powers of 2**: 1, 2, 4, 8, 16, 32, 64, ?
  - **Free Input**: no deck — each user types their own value (e.g. `2.5d`, `3 PT`)
- **Allow Custom Input** — toggle (moderator, anytime): shows an additional free-text field
  alongside the normal card deck. Useful for entering person-days or other units alongside
  story points. Only available when Free Input mode is not active.
- Optional **topic label** — moderator can set a short text (e.g. "US-42") so everyone knows what is being estimated
- Round flow:
  1. Moderator starts voting (optionally: set a timer)
  2. Each voter picks a card (hidden — others only see "✓ voted")
  3. Once **all** online voters have voted → auto-reveal (if enabled)
  4. Alternatively: moderator reveals manually
  5. Results visible: all cards + average, median, most common value
  6. Moderator starts a new round (reset) or the team discusses
- **Auto-reveal** — toggle (moderator, default: on): automatically reveals cards once all voters have voted. When off, the moderator must reveal manually.
- **Allow vote change** — toggle (moderator, default: on): allows voters to update their answer after submitting. When off, the card is locked after the first click.

### 2.4 Real-time (WebSockets)
- All state changes go through **Socket.IO**:
  - Participant joins / leaves the room
  - Card selected (signal only — value stays hidden)
  - Cards revealed
  - Timer ticks
  - Card set / topic changed
- Reconnect handling: on page reload, JWT from `localStorage` → automatically reconnected

---

## 3. UI/UX

### 3.1 Pages
| Route          | Description                                                                  |
| -------------- | ---------------------------------------------------------------------------- |
| `/`            | Landing page — "New Room" button + optional input field for an existing UUID |
| `/room/[uuid]` | Name modal (if no JWT) → directly into the game board                        |

### 3.2 Game Board Layout (`/room/[uuid]`)
```
┌──────────────────────────────────────────────────┐
│ 🃏 Planning Poker  [abc-123…]  [🔗 Copy link]  ⚙ │
│                   Topic: "US-42"   ⏱ 00:42        │
├──────────────────────────────────────────────────┤
│  Participant avatars (cards hidden / revealed)    │
│   [Alice ✓]  [Bob ✓]  [Carol ?]  [Dave ✓]        │
├──────────────────────────────────────────────────┤
│ Card pick:  [1] [2] [3] [5] [8] [13] [21] [?]    │
├──────────────────────────────────────────────────┤
│ Results: avg 5.3  median 5  most common 5         │
│ [↺ New Round]                                     │
└──────────────────────────────────────────────────┘
```

### 3.3 Design Principles
- **Mobile-first**, responsive
- Dark theme (**navy/orange** color scheme: `#060810` background, `#ff6600` accent)
- Minimalist — no overhead, full focus on voting

---

## 4. Tech Stack

| Layer          | Technology                                                        |
| -------------- | ----------------------------------------------------------------- |
| Framework      | **Next.js 16** (App Router)                                       |
| Language       | **TypeScript**                                                    |
| Styling        | **Tailwind CSS v4**                                               |
| Real-time      | **Socket.IO** (Server + Client)                                   |
| Auth           | **JWT** (`jsonwebtoken`) — stateless, no session store            |
| State (Client) | **Zustand**                                                       |
| State (Server) | **In-memory only** (`Map<roomId, Room>`)                          |
| Persistence    | **None** — state lives only for the process lifetime              |
| Runtime        | **tsx** (runs TypeScript directly, no compile step)               |
| Deployment     | **Docker** — single container (Next.js + Socket.IO custom server) |

> If the container restarts, all rooms are gone. Deliberate decision —
> no persistent state, no privacy concerns, no ops overhead.

---

## 5. Data Model

### 5.1 JWT Payload
```typescript
interface JwtPayload {
  participantId: string;  // UUID, generated per browser/name
  name: string;
  role: 'moderator' | 'voter' | 'observer';
  roomId: string;
  iat: number;
  exp: number;            // 24h TTL
}
```

> JWT is stored in `localStorage` (`pp_token_<roomId>`).
> The server **verifies** only — stores nothing. Role is authoritative in the store
> (when transferred mid-session, a new JWT is pushed via `token:updated`).

### 5.2 Room State (In-Memory)
```typescript
export interface Room {
  id: string;
  cardSet: 'fibonacci' | 'tshirt' | 'powers2' | 'freetext';
  allowCustom: boolean;     // show free-text input alongside the selected card deck
  autoReveal: boolean;      // auto-reveal when all voters have voted
  allowVoteChange: boolean; // voters can change their answer after submitting
  topic: string;            // optional label for the current round
  createdAt: string;
  lastActivityAt: string;
  participants: Participant[];
  phase: 'waiting' | 'voting' | 'revealed';
  votes: Record<string, string>;  // participantId → value (only visible after reveal)
  timer?: { duration: number; startedAt: string } | null;
}

interface Participant {
  id: string;
  name: string;
  role: 'moderator' | 'voter' | 'observer';
  isOnline: boolean;
  hasVoted: boolean;    // true = has voted (value hidden until reveal)
}
```

---

## 6. WebSocket Events

```
// Client → Server
'vote:cast'           (value: string)
'vote:reveal'         ()                  – moderator only
'vote:reset'          ()                  – moderator only, starts new round
'topic:set'           (topic: string)     – moderator only
'cardset:change'      (cardSet)           – moderator only
'allowcustom:set'     (value: boolean)    – moderator only
'autoreveal:set'      (value: boolean)    – moderator only
'votechange:set'      (value: boolean)    – moderator only
'timer:start'         (duration: number)  – moderator only
'role:transfer'       (participantId)     – moderator only
'moderator:claim'     ()                  – only when no moderator is online

// Server → Client
'room:state'          (room)             – full state on connect
'room:update'         (patch)            – partial delta
'participant:joined'  (participant)
'participant:left'    (participantId)
'participant:voted'   (participantId)    – signal only, no value
'votes:revealed'      (votes)            – all votes visible
'votes:reset'         ()
'timer:tick'          (remaining)
'token:updated'       (newToken)         – after role transfer
'error'               ({ code, message })
```

---

## 7. Auth Flow & Server Restart Behaviour

```
1. User opens /
   → clicks "New Room"
   → POST /api/rooms  →  { roomId }
   → redirect to /room/<uuid>

2. User opens /room/<uuid> (via shared link)
   → no valid JWT in localStorage
   → name modal appears + voter/observer selection
   → POST /api/rooms/<uuid>/join  { name, role? }
   → server: ensureRoom(id) – creates room if it doesn't exist
   → first person → moderator, others → voter/observer
   → JWT returned → stored in localStorage → WebSocket connects

3. Reconnect / page reload
   → JWT from localStorage → WebSocket connects with JWT in auth.token
   → server: ensureRoom(id) – if room was lost after restart, it is
     automatically recreated (empty state, same UUID)
   → participant is added → room:state is sent
   → all other clients rejoin as well → room fills up again
```

> **Server restart**: all rooms are cleared from memory, but existing JWTs remain
> valid (24h TTL). On the next connect the room is automatically recreated.
> The room starts with empty state (no votes, phase: waiting) — the team simply continues.

---

## 8. Non-functional Requirements

- **Latency**: WebSocket updates < 100 ms
- **Scale**: up to ~50 rooms × 20 participants per container instance
- **Privacy**: no persistent storage of personal data
- **Browser support**: last 2 versions of Chrome, Firefox, Safari, Edge

---

## 9. Decisions

| Topic              | Decision                                                                        |
| ------------------ | ------------------------------------------------------------------------------- |
| Story management   | **Not included** — team communicates externally (Jira, meeting)                 |
| Moderator handover | **Manual** — or claim button when moderator goes offline                        |
| Card set           | **Changeable at any time** incl. free-input mode                                |
| Allow custom input | **Toggle** — free-text alongside card deck (e.g. for person-days)               |
| Auto-reveal        | **Toggle** (default: on) — auto-reveal when all voters have voted               |
| Allow vote change  | **Toggle** (default: on) — voters can update their answer after submitting      |
| Settings panel     | Stays open when changing card set; closes only on timer start                   |
| Server restart     | Rooms are **automatically recreated** when a client reconnects with a valid JWT |
| Persistence        | **None** — pure in-memory                                                       |
| Jira integration   | **No**                                                                          |
| Export             | **No**                                                                          |
| Deployment         | **Docker** (`docker compose up --build`)                                        |


---

## 2. Kernfunktionalitäten

### 2.1 Räume (Rooms)
- User klickt auf **„New Room"** → App generiert eine **UUID v4** als Room-ID
- User wird sofort zu `/room/<uuid>` weitergeleitet und als **Moderator** eingesetzt
- Der **Raum-Link** (`/room/<uuid>`) wird prominent angezeigt + Copy-Button zum Teilen
- Raum läuft **temporär** – wird nach 24h Inaktivität aus dem Memory gelöscht
- Kein Passwortschutz (Security through obscurity der UUID reicht für den Use-Case)

### 2.2 Teilnehmer
- Jeder User, der `/room/<uuid>` öffnet, gibt einen **Anzeigenamen** ein → direkt beigetreten
- Identität wird per **JWT** in `localStorage` gehalten (bleibt bei Seitenreload erhalten)
- Rollen:
  - **Moderator** – erste Person im Raum; startet/deckt auf, setzt Timer, ändert Kartensatz, überträgt Rolle manuell
  - **Voter** – alle weiteren Teilnehmer; schätzen und sehen Ergebnisse
  - **Observer** – wählt beim Beitreten „nur zuschauen", stimmt nicht ab

> **Moderator offline ohne Übergabe**: Jeder Voter sieht den Button
> **„Claim Moderator"** – erste Person die klickt bekommt die Rolle
> (neues JWT mit `role: 'moderator'` wird ausgestellt).

### 2.3 Voting (Schätzung)
- Unterstützte Kartensätze (**jederzeit vom Moderator änderbar**):
  - **Fibonacci**: 0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?, ☕
  - **T-Shirt**: XS, S, M, L, XL, XXL, ?
  - **Powers of 2**: 1, 2, 4, 8, 16, 32, 64, ?
  - **Free Input**: kein Deck – jeder User tippt seinen Wert frei ein (z. B. `2.5d`, `3 PT`)
- **Allow Custom Input** – Toggle (Moderator, jederzeit): Zeigt zusätzlich ein Freitext-Feld
  neben dem normalen Kartendeck an. So können z. B. Personentage oder andere Einheiten
  neben Story Points eingegeben werden. Nur verfügbar wenn kein Free-Input-Modus aktiv.
- Optionales **Topic-Label** – Moderator kann kurzen Text setzen (z. B. „US-42") damit alle wissen, was gerade geschätzt wird
- Ablauf einer Runde:
  1. Moderator startet Voting (optional: Timer setzen)
  2. Jeder Voter wählt eine Karte (verdeckt – andere sehen nur „✓ hat gewählt")
  3. Sobald **alle** online Voter abgestimmt haben → Auto-Reveal (wenn aktiviert)
  4. Alternativ: Moderator deckt manuell auf
  5. Ergebnis sichtbar: alle Karten + Ø, Median, häufigster Wert
  6. Moderator startet neue Runde (Reset) oder das Team diskutiert
- **Auto-reveal** – Toggle (Moderator, Standard: an): Deckt automatisch auf, sobald alle Voter abgestimmt haben. Wenn aus, muss der Moderator manuell aufdecken.
- **Allow vote change** – Toggle (Moderator, Standard: an): Erlaubt Votern ihre Antwort nach dem Absenden noch zu ändern. Wenn aus, ist die Karte nach dem ersten Klick gesperrt.

### 2.4 Echtzeit (WebSockets)
- Alle Zustandsänderungen laufen über **Socket.IO**:
  - Teilnehmer tritt bei / verlässt den Raum
  - Karte wurde gewählt (nur Signal – Wert bleibt verdeckt)
  - Karten aufgedeckt
  - Timer-Ticks
  - Kartensatz / Topic geändert
- Reconnect-Handling: bei Seitenreload JWT aus `localStorage` → automatisch wieder verbunden

---

## 3. UI/UX

### 3.1 Seiten
| Route          | Beschreibung                                                                    |
| -------------- | ------------------------------------------------------------------------------- |
| `/`            | Landing Page – „New Room"-Button + optionales Eingabefeld für existierende UUID |
| `/room/[uuid]` | Name-Modal (falls kein JWT) → direkt Spielfeld                                  |

### 3.2 Spielfeld-Layout (`/room/[uuid]`)
```
┌──────────────────────────────────────────────────┐
│ 🃏 Planning Poker  [abc-123…]  [🔗 Copy link]  ⚙ │
│                   Topic: "US-42"   ⏱ 00:42        │
├──────────────────────────────────────────────────┤
│  Avatare der Teilnehmer (Karten verdeckt/offen)   │
│   [Alice ✓]  [Bob ✓]  [Carol ?]  [Dave ✓]        │
├──────────────────────────────────────────────────┤
│ Kartenwahl:  [1] [2] [3] [5] [8] [13] [21] [?]   │
├──────────────────────────────────────────────────┤
│ Ergebnis: Ø 5.3  Median 5  Häufigst 5            │
│ [↺ New Round]                                     │
└──────────────────────────────────────────────────┘
```

### 3.3 Design-Prinzipien
- **Mobile-first**, responsive
- Dark Theme (**navy/orange** Farbschema: `#060810` Hintergrund, `#ff6600` Akzent)
- Minimalistisch – kein Overhead, voller Fokus auf das Voting

---

## 4. Tech Stack

| Schicht        | Technologie                                                             |
| -------------- | ----------------------------------------------------------------------- |
| Framework      | **Next.js 16** (App Router)                                             |
| Sprache        | **TypeScript**                                                          |
| Styling        | **Tailwind CSS v4**                                                     |
| Echtzeit       | **Socket.IO** (Server + Client)                                         |
| Auth           | **JWT** (`jsonwebtoken`) – stateless, kein Session-Store                |
| State (Client) | **Zustand**                                                             |
| State (Server) | **In-Memory only** (`Map<roomId, Room>`)                                |
| Persistenz     | **Keine** – State lebt nur in der Prozess-Lifetime                      |
| Laufzeit       | **tsx** (TypeScript direkt ausführen, kein Compile-Schritt)             |
| Deployment     | **Docker** – ein einziger Container (Next.js + Socket.IO Custom Server) |

> Wenn der Container neu startet, sind alle Räume weg. Bewusste Entscheidung –
> kein persistenter State, keine DSGVO-Probleme, kein Ops-Overhead.

---

## 5. Datenmodell

### 5.1 JWT Payload
```typescript
interface JwtPayload {
  participantId: string;  // UUID, pro Browser/Name generiert
  name: string;
  role: 'moderator' | 'voter' | 'observer';
  roomId: string;
  iat: number;
  exp: number;            // 24h TTL
}
```

> JWT wird in `localStorage` gespeichert (`pp_token_<roomId>`).
> Server **verifiziert** nur – speichert nichts. Rolle ist im Store autoritativ
> (bei mid-session Transfers wird neues JWT gepusht via `token:updated`).

### 5.2 Room State (In-Memory)
```typescript
export interface Room {
  id: string;
  cardSet: 'fibonacci' | 'tshirt' | 'powers2' | 'freetext';
  allowCustom: boolean;   // zeigt Freitext-Input zusätzlich zum Kartendeck
  autoReveal: boolean;    // automatisches Aufdecken wenn alle Voter abgestimmt haben
  allowVoteChange: boolean; // Voter können Antwort nachträglich ändern
  topic: string;          // optionales Label für die aktuelle Runde
  createdAt: string;
  lastActivityAt: string;
  participants: Participant[];
  phase: 'waiting' | 'voting' | 'revealed';
  votes: Record<string, string>;  // participantId → Wert (nur nach Reveal sichtbar)
  timer?: { duration: number; startedAt: string } | null;
}

interface Participant {
  id: string;
  name: string;
  role: 'moderator' | 'voter' | 'observer';
  isOnline: boolean;
  hasVoted: boolean;    // true = hat gewählt (Wert verdeckt bis Reveal)
}
```

---

## 6. WebSocket Events

```
// Client → Server
'vote:cast'           (value: string)
'vote:reveal'         ()                  – nur Moderator
'vote:reset'          ()                  – nur Moderator, startet neue Runde
'topic:set'           (topic: string)     – nur Moderator
'cardset:change'      (cardSet)           – nur Moderator
'allowcustom:set'     (value: boolean)    – nur Moderator
'autoreveal:set'      (value: boolean)    – nur Moderator
'votechange:set'      (value: boolean)    – nur Moderator
'timer:start'         (duration: number)  – nur Moderator
'role:transfer'       (participantId)     – nur Moderator
'moderator:claim'     ()                  – nur wenn kein Mod online

// Server → Client
'room:state'          (room)             – vollständiger State beim Connect
'room:update'         (patch)            – partielles Delta
'participant:joined'  (participant)
'participant:left'    (participantId)
'participant:voted'   (participantId)    – nur Signal, kein Wert
'votes:revealed'      (votes)            – alle Votes sichtbar
'votes:reset'         ()
'timer:tick'          (remaining)
'token:updated'       (newToken)         – nach Rollen-Transfer
'error'               ({ code, message })
```

---

## 7. Auth-Flow & Server-Restart-Verhalten

```
1. User öffnet /
   → klickt "New Room"
   → POST /api/rooms  →  { roomId }
   → Redirect zu /room/<uuid>

2. User öffnet /room/<uuid> (via geteiltem Link)
   → kein gültiges JWT in localStorage
   → Name-Modal erscheint + Voter/Observer wählen
   → POST /api/rooms/<uuid>/join  { name, role? }
   → Server: ensureRoom(id) – erstellt Raum falls nicht vorhanden
   → erste Person → moderator, sonst voter/observer
   → JWT zurück → in localStorage gespeichert → WebSocket verbindet

3. Reconnect / Seitenreload
   → JWT aus localStorage → WebSocket-Connect mit JWT im auth.token
   → Server: ensureRoom(id) – falls Raum nach Neustart weg ist, wird er
     automatisch neu angelegt (leerer State, gleiche UUID)
   → Participant wird hinzugefügt → room:state wird gesendet
   → Alle anderen Clients joinen ebenfalls neu → Raum füllt sich wieder
```

> **Server-Neustart**: Alle Räume werden aus dem Memory gelöscht, aber
> bestehende JWTs bleiben gültig (24h TTL). Beim nächsten Connect wird der
> Raum automatisch neu angelegt. Der Raum startet mit leerem State (keine
> Votes, Phase: waiting) – das Team macht einfach weiter.

---

## 8. Nicht-funktionale Anforderungen

- **Latenz**: WebSocket-Updates < 100 ms
- **Skalierung**: bis ~50 Räume à 20 Teilnehmer pro Container-Instanz
- **Datenschutz**: keinerlei persistente Speicherung personenbezogener Daten
- **Browser-Support**: letzte 2 Versionen Chrome, Firefox, Safari, Edge

---

## 9. Entschiedene Punkte

| Punkt              | Entscheidung                                                                         |
| ------------------ | ------------------------------------------------------------------------------------ |
| Story-Verwaltung   | **Nicht vorhanden** – Team kommuniziert extern (Jira, Meeting)                       |
| Moderator-Übergabe | **Manuell** – oder Claim-Button wenn Mod offline                                     |
| Kartensatz         | **Jederzeit änderbar** inkl. Free-Input-Modus                                        |
| Allow Custom Input | **Toggle** – Freitext neben Kartendeck (z. B. für Personentage)                      |
| Auto-reveal        | **Toggle** (Standard: an) – automatisches Aufdecken wenn alle Voter abgestimmt haben |
| Allow vote change  | **Toggle** (Standard: an) – Voter können ihre Antwort nachträglich ändern            |
| Settings-Panel     | Bleibt offen beim Wechsel des Kartensatzes; schließt nur beim Timer-Start            |
| Server-Neustart    | Räume werden **automatisch neu angelegt** wenn Client mit gültigem JWT reconnectet   |
| Persistenz         | **Keine** – reines In-Memory                                                         |
| Jira-Integration   | **Nein**                                                                             |
| Export             | **Nein**                                                                             |
| Deployment         | **Docker** (`docker compose up --build`)                                             |
