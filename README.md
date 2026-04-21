# MusicMind

A musical twist on the classic Mastermind code-breaking game. Crack the secret 4-note melody using colour and sound.

**Play it here:** https://gregkaighin.github.io/MusicMind/

---

## How to Play

A secret melody of 4 notes is generated at the start of each game. You have **10 attempts** to guess it.

Each note is represented by a colour, corresponding to a note in the C major scale:

| Colour | Note | Solfège |
|--------|------|---------|
| 🔴 Red | C | Do |
| 🟠 Orange | D | Re |
| 🟡 Yellow | E | Mi |
| 🟢 Green | F | Fa |
| 🔵 Cyan | G | Sol |
| 💙 Blue | A | La |
| 🟣 Purple | B | Si |

After each guess, feedback pegs tell you how close you are:

- ⚪ **White peg** — correct note, correct position
- ○ **Hollow peg** — correct note, wrong position
- · **Empty** — note not in the melody

Notes can repeat in the secret melody.

---

## Controls

**Mouse / Touchscreen**
- Tap a colour in the palette to place it in the next slot
- Tap a slot to select it, then tap a colour to change it
- ♪ — play your current guess as a melody
- ⌫ — clear the current guess
- **Check** — submit your guess

**Keyboard**
| Key | Action |
|-----|--------|
| `1` – `7` | Place note 1–7 |
| `Backspace` | Remove last note |
| `Enter` | Submit guess / New game |
| `Space` | Play current guess as melody |

---

## Audio Feedback

The game gives rich audio feedback on every action:

- **Placing a note** — a punchy pitched click with percussive attack
- **♪ Play** — hear your guess as a melody
- **Complete miss** — deep hollow thud that drops in pitch
- **Right notes, wrong positions** — swirling bouncing tones, one per correct note
- **Right positions** — ascending bell chimes, one per correct position
- **Mixed result** — warm major chord stab
- **Getting warmer** (more correct positions than last guess) — rising sweep before the result
- **Getting colder** (fewer correct positions) — falling sweep before the result
- **Win** — triumphant ascending arpeggio followed by a full chord
- **Lose** — descending arpeggio and low thud, followed by the secret melody

---

## Scoring

| Guess number | Points awarded |
|---|---|
| 1st guess | 9 |
| 2nd guess | 8 |
| … | … |
| 10th guess | 1 |

- **Score** — cumulative points across all games
- **Best** — highest single-game score
- **Streak** — consecutive wins (🔥 at 3+)

Scores are saved locally in your browser.

---

## Built With

- HTML5
- CSS3
- Vanilla JavaScript
- Web Audio API

No frameworks, no dependencies. Fully responsive — works on mobile and touchscreen devices.

---

## License

MIT
