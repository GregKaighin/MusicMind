'use strict';

const NOTES = [
    { name: 'Do',  sym: 'C', freq: 261.63, cssVar: '--c-do'  },
    { name: 'Re',  sym: 'D', freq: 293.66, cssVar: '--c-re'  },
    { name: 'Mi',  sym: 'E', freq: 329.63, cssVar: '--c-mi'  },
    { name: 'Fa',  sym: 'F', freq: 349.23, cssVar: '--c-fa'  },
    { name: 'Sol', sym: 'G', freq: 392.00, cssVar: '--c-sol' },
    { name: 'La',  sym: 'A', freq: 440.00, cssVar: '--c-la'  },
    { name: 'Si',  sym: 'B', freq: 493.88, cssVar: '--c-si'  },
];

const CODE_LEN   = 4;
const MAX_GUESSES = 10;

/* ===== AUDIO ===== */
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function tone(freq, startTime, duration, type = 'triangle', volume = 0.45) {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
    return osc;
}

function playNote(freq, startTime, duration = 0.6) {
    const ctx = getAudioCtx();
    // Main triangle wave + quiet octave-up sine for richness
    tone(freq,     startTime, duration, 'triangle', 0.42);
    tone(freq * 2, startTime, duration, 'sine',     0.08);
}

function playMelody(indices, noteDuration = 0.6, gap = 0.5) {
    const ctx = getAudioCtx();
    const now = ctx.currentTime + 0.05;
    indices.forEach((idx, i) => playNote(NOTES[idx].freq, now + i * gap, noteDuration));
}

// Satisfying peg-place sound: punchy note with pitch-drop and percussive click
function playPegPlace(noteIdx) {
    const ctx = getAudioCtx();
    const now = ctx.currentTime + 0.01;
    const freq = NOTES[noteIdx].freq;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 1.1, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + 0.18);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.start(now);
    osc.stop(now + 0.22);

    // Percussive click layer
    const click = ctx.createOscillator();
    const cGain = ctx.createGain();
    click.connect(cGain);
    cGain.connect(ctx.destination);
    click.type = 'square';
    click.frequency.value = 900;
    cGain.gain.setValueAtTime(0.07, now);
    cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    click.start(now);
    click.stop(now + 0.03);
}

// Complete miss — deep hollow thud
function playMiss() {
    const ctx = getAudioCtx();
    const now = ctx.currentTime + 0.05;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.55);
    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.start(now);
    osc.stop(now + 0.6);
}

// Correct notes, wrong positions — swirling "almost!" bouncing tones
function playWrongPositions(whites) {
    const ctx = getAudioCtx();
    const now = ctx.currentTime + 0.05;
    for (let i = 0; i < whites; i++) {
        const freq = 380 + i * 90;
        const t = now + i * 0.13;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq,        t);
        osc.frequency.linearRampToValueAtTime(freq * 1.25, t + 0.1);
        osc.frequency.linearRampToValueAtTime(freq,        t + 0.2);
        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
    }
}

// Correct positions — ascending bell chimes, one per black peg
function playCorrectPositions(blacks) {
    const ctx = getAudioCtx();
    const now = ctx.currentTime + 0.05;
    const steps = [1, 5/4, 3/2, 2];
    for (let i = 0; i < blacks; i++) {
        tone(440 * steps[i], now + i * 0.15, 0.55, 'sine', 0.35);
    }
}

// Mixed result — warm major chord stab
function playMixed() {
    const ctx = getAudioCtx();
    const now = ctx.currentTime + 0.05;
    [330, 330 * 5/4, 330 * 3/2].forEach((f, i) => {
        tone(f, now + i * 0.04, 0.5, 'sine', 0.22);
    });
}

// Getting warmer — rising sweep
function playWarmer() {
    const ctx = getAudioCtx();
    const now = ctx.currentTime + 0.05;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.35);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.4);
}

// Getting colder — falling sweep
function playColder() {
    const ctx = getAudioCtx();
    const now = ctx.currentTime + 0.05;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.45);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
}

// Orchestrate all guess feedback
function playGuessFeedback(blacks, whites) {
    if (blacks === CODE_LEN) return; // win handled separately

    const prevBlacks = guesses.length >= 2 ? guesses[guesses.length - 2].blacks : null;
    const total = blacks + whites;

    // Step 1: warmer/colder sweep (80ms delay so it doesn't clash with peg sounds)
    if (prevBlacks !== null) {
        if (blacks > prevBlacks)      setTimeout(playWarmer, 80);
        else if (blacks < prevBlacks) setTimeout(playColder, 80);
    }

    // Step 2: result detail (after the sweep)
    const resultDelay = prevBlacks !== null ? 420 : 80;
    setTimeout(() => {
        if (total === 0)                  playMiss();
        else if (blacks > 0 && whites > 0) playMixed();
        else if (blacks > 0)              playCorrectPositions(blacks);
        else                              playWrongPositions(whites);
    }, resultDelay);
}

function playWin() {
    const ctx = getAudioCtx();
    const now = ctx.currentTime + 0.05;
    // Ascending arpeggio then full chord
    [0, 2, 4, 6].forEach((n, i) => {
        tone(NOTES[n].freq * 2, now + i * 0.14, 0.6, 'triangle', 0.38);
    });
    // Final chord burst
    [0, 2, 4].forEach(n => {
        tone(NOTES[n].freq * 2, now + 0.7, 0.9, 'sine', 0.2);
    });
}

function playLose() {
    const ctx = getAudioCtx();
    const now = ctx.currentTime + 0.05;
    [6, 4, 2, 0].forEach((n, i) => {
        tone(NOTES[n].freq * 0.5, now + i * 0.25, 0.6, 'triangle', 0.38);
    });
    // Final low thud
    tone(60, now + 1.1, 0.7, 'sine', 0.4);
}

/* ===== GAME STATE ===== */
let secret       = [];
let guesses      = [];   // [{guess, blacks, whites}]
let currentGuess = [];   // up to CODE_LEN indices
let activeSlot   = 0;
let gameOver     = false;
let totalScore   = 0;
let streak       = 0;
let bestGame     = 0;

function loadStorage() {
    totalScore = parseInt(localStorage.getItem('mm_score') || '0', 10);
    streak     = parseInt(localStorage.getItem('mm_streak') || '0', 10);
    bestGame   = parseInt(localStorage.getItem('mm_best') || '0', 10);
}

function saveStorage() {
    localStorage.setItem('mm_score',  totalScore);
    localStorage.setItem('mm_streak', streak);
    localStorage.setItem('mm_best',   bestGame);
}

function generateSecret() {
    return Array.from({ length: CODE_LEN }, () => Math.floor(Math.random() * NOTES.length));
}

function evaluate(guess, secret) {
    let blacks = 0, whites = 0;
    const sc = [...secret], gc = [...guess];

    for (let i = 0; i < CODE_LEN; i++) {
        if (gc[i] === sc[i]) { blacks++; sc[i] = gc[i] = -1; }
    }
    for (let i = 0; i < CODE_LEN; i++) {
        if (gc[i] === -1) continue;
        const j = sc.indexOf(gc[i]);
        if (j !== -1) { whites++; sc[j] = -1; }
    }
    return { blacks, whites };
}

function roundScore(guessNumber) {
    return (MAX_GUESSES - guessNumber + 1) * 100;
}

/* ===== DOM HELPERS ===== */
const $ = id => document.getElementById(id);

function makePeg(noteIdx) {
    const el = document.createElement('div');
    el.className = 'peg';
    el.dataset.note = noteIdx;
    el.textContent = '';
    return el;
}

function makeEmptyPeg() {
    const el = document.createElement('div');
    el.className = 'peg peg-empty-slot';
    return el;
}

function makeFeedbackGrid(blacks, whites) {
    const grid = document.createElement('div');
    grid.className = 'row-feedback';
    const total = blacks + whites;
    for (let i = 0; i < CODE_LEN; i++) {
        const fb = document.createElement('div');
        fb.className = 'fb-peg ' + (i < blacks ? 'fb-black' : i < total ? 'fb-white' : 'fb-none');
        grid.appendChild(fb);
    }
    return grid;
}

/* ===== RENDER ===== */
function renderBoard() {
    const board = $('board');
    board.innerHTML = '';

    guesses.forEach((entry, i) => {
        const row = document.createElement('div');
        row.className = 'board-row';

        const num = document.createElement('span');
        num.className = 'row-number';
        num.textContent = i + 1;

        const pegs = document.createElement('div');
        pegs.className = 'row-pegs';
        entry.guess.forEach(n => pegs.appendChild(makePeg(n)));

        row.appendChild(num);
        row.appendChild(pegs);
        row.appendChild(makeFeedbackGrid(entry.blacks, entry.whites));
        board.appendChild(row);
    });

    // Scroll to bottom
    const wrap = document.querySelector('.board-wrap');
    wrap.scrollTop = wrap.scrollHeight;
}

function renderCurrentSlots() {
    const container = $('currentSlots');
    container.innerHTML = '';

    for (let i = 0; i < CODE_LEN; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.dataset.slot = i;

        if (i < currentGuess.length) {
            const noteIdx = currentGuess[i];
            slot.dataset.note = noteIdx;
            slot.textContent = '';
            slot.classList.add('filled');
        } else {
            slot.classList.add('empty-slot');
        }

        if (i === activeSlot && !gameOver) slot.classList.add('active-slot');

        slot.addEventListener('click', () => onSlotClick(i));
        container.appendChild(slot);
    }

    $('submitBtn').disabled = currentGuess.length < CODE_LEN;
}

function renderScores() {
    $('totalScore').textContent = totalScore;
    $('bestScore').textContent  = bestGame;
    $('streak').textContent     = streak + (streak >= 3 ? '🔥' : '');
}

function buildPalette() {
    const palette = $('palette');
    palette.innerHTML = '';
    NOTES.forEach((note, i) => {
        const btn = document.createElement('button');
        btn.className = 'palette-btn';
        btn.dataset.note = i;
        btn.setAttribute('aria-label', `${note.name} (${note.sym})`);
        btn.innerHTML = `<span class="note-name">${note.name}</span><span class="note-sym">${note.sym}</span>`;
        btn.addEventListener('click', () => onPaletteClick(i));
        palette.appendChild(btn);
    });
}

function buildNoteLegend() {
    const legend = $('noteLegend');
    NOTES.forEach((note, i) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        const dot = document.createElement('div');
        dot.className = 'legend-dot';
        dot.style.background = getComputedStyle(document.documentElement).getPropertyValue(note.cssVar).trim();
        item.appendChild(dot);
        item.appendChild(document.createTextNode(`${note.name} (${note.sym})`));
        legend.appendChild(item);
    });
}

/* ===== INTERACTION ===== */
function onSlotClick(i) {
    if (gameOver) return;
    activeSlot = i;
    renderCurrentSlots();
}

function onPaletteClick(noteIdx) {
    if (gameOver) return;

    // Wake up audio on first user gesture
    getAudioCtx();
    playPegPlace(noteIdx);

    if (activeSlot < CODE_LEN) {
        currentGuess[activeSlot] = noteIdx;
        // Advance to next empty slot
        activeSlot = Math.min(activeSlot + 1, CODE_LEN - 1);
        // If that slot is already filled, keep moving forward to first empty
        for (let i = 0; i < CODE_LEN; i++) {
            if (currentGuess[i] === undefined) { activeSlot = i; break; }
        }
    } else {
        // All slots filled — replace active slot
        currentGuess[activeSlot] = noteIdx;
    }

    const slots = document.querySelectorAll('.slot');
    const changed = slots[activeSlot - 1] || slots[activeSlot];
    if (changed) changed.classList.add('peg-drop');
    setTimeout(() => changed?.classList.remove('peg-drop'), 300);

    renderCurrentSlots();
}

function onClear() {
    if (gameOver) return;
    currentGuess = [];
    activeSlot   = 0;
    renderCurrentSlots();
}

function onPlay() {
    if (currentGuess.length === 0) return;
    playMelody(currentGuess);
}

function onSubmit() {
    if (gameOver || currentGuess.length < CODE_LEN) return;

    const { blacks, whites } = evaluate(currentGuess, secret);
    guesses.push({ guess: [...currentGuess], blacks, whites });
    currentGuess = [];
    activeSlot   = 0;

    renderBoard();
    renderCurrentSlots();

    if (blacks === CODE_LEN) {
        onWin();
    } else if (guesses.length >= MAX_GUESSES) {
        onLoss();
    } else {
        playGuessFeedback(blacks, whites);
    }
}

/* ===== WIN / LOSS ===== */
function onWin() {
    gameOver = true;
    const roundPoints = roundScore(guesses.length);
    totalScore += roundPoints;
    streak++;
    if (roundPoints > bestGame) bestGame = roundPoints;
    saveStorage();
    renderScores();

    playWin();
    setTimeout(() => showOverlay(true, roundPoints), 600);
}

function onLoss() {
    gameOver = true;
    streak   = 0;
    saveStorage();
    renderScores();

    playLose();
    setTimeout(() => showOverlay(false, 0), 600);
}

function showOverlay(won, points) {
    $('overlayEmoji').textContent  = won ? '🎵' : '🎶';
    $('overlayTitle').textContent  = won ? 'Brilliant!' : 'Unlucky!';
    $('overlayMsg').textContent    = won
        ? `You cracked the melody in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}!`
        : `The secret melody was:`;

    const display = $('secretDisplay');
    display.innerHTML = '';
    secret.forEach(n => display.appendChild(makePeg(n)));

    $('overlayScore').textContent = won ? `+${points} points` : '';

    $('overlay').hidden = false;

    // Play secret melody after a beat
    setTimeout(() => playMelody(secret), 400);
}

/* ===== NEW GAME ===== */
function newGame() {
    secret       = generateSecret();
    guesses      = [];
    currentGuess = [];
    activeSlot   = 0;
    gameOver     = false;

    $('overlay').hidden = true;
    renderBoard();
    renderCurrentSlots();
    renderScores();
}

/* ===== KEYBOARD ===== */
document.addEventListener('keydown', e => {
    if ($('overlay').hidden === false && e.key === 'Enter') { newGame(); return; }
    if (gameOver) return;

    const keyMap = { '1':0, '2':1, '3':2, '4':3, '5':4, '6':5, '7':6 };
    if (keyMap[e.key] !== undefined) { onPaletteClick(keyMap[e.key]); return; }

    if (e.key === 'Backspace' || e.key === 'Delete') {
        if (currentGuess.length > 0) {
            currentGuess.pop();
            activeSlot = Math.max(0, currentGuess.length);
            renderCurrentSlots();
        }
        return;
    }

    if (e.key === 'Enter') { onSubmit(); return; }
    if (e.key === ' ')     { onPlay();  return; }
});

/* ===== INIT ===== */
function init() {
    loadStorage();
    buildPalette();
    buildNoteLegend();

    $('submitBtn').addEventListener('click', onSubmit);
    $('clearBtn').addEventListener('click',  onClear);
    $('playBtn').addEventListener('click',   onPlay);
    $('newGameBtn').addEventListener('click', newGame);
    $('helpBtn').addEventListener('click',   () => { $('helpOverlay').hidden = false; });
    $('closeHelpBtn').addEventListener('click', () => { $('helpOverlay').hidden = true; });

    newGame();
}

document.addEventListener('DOMContentLoaded', init);
