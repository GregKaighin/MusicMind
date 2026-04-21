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
let compressor = null;

function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.knee.value      = 20;
        compressor.ratio.value     = 8;
        compressor.attack.value    = 0.003;
        compressor.release.value   = 0.2;
        compressor.connect(audioCtx.destination);
    }
    return audioCtx;
}

function getOut() { getAudioCtx(); return compressor; }

// Simple tone for UI feedback sounds (not piano)
function tone(freq, startTime, duration, type = 'sine', volume = 0.35) {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(getOut());
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
}

// Piano synthesis: additive harmonics + hammer transient + two-stage decay
function playNote(freq, startTime, duration = 1.4) {
    const ctx = getAudioCtx();
    const out = getOut();

    // Master envelope — fast attack, quick initial decay, long singing tail
    const master = ctx.createGain();
    master.connect(out);
    master.gain.setValueAtTime(0, startTime);
    master.gain.linearRampToValueAtTime(0.9,  startTime + 0.007);
    master.gain.exponentialRampToValueAtTime(0.45, startTime + 0.07);
    master.gain.exponentialRampToValueAtTime(0.18, startTime + 0.5);
    master.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    // Harmonic series — each partial at a sine wave
    // Slight inharmonicity stretching mimics piano string stiffness
    const partials = [
        { n: 1, v: 0.50 },
        { n: 2, v: 0.24 },
        { n: 3, v: 0.15 },
        { n: 4, v: 0.09 },
        { n: 5, v: 0.05 },
        { n: 6, v: 0.025 },
        { n: 7, v: 0.012 },
    ];

    partials.forEach(({ n, v }) => {
        const inharmonicity = 1 + (n * n - 1) * 0.00018;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(master);
        osc.type = 'sine';
        osc.frequency.value = freq * n * inharmonicity;
        // Higher harmonics decay faster (string characteristic)
        gain.gain.setValueAtTime(v, startTime);
        gain.gain.exponentialRampToValueAtTime(v * 0.3, startTime + 0.3 / n);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration * (1 / Math.sqrt(n)));
        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
    });

    // Hammer transient — short filtered noise burst
    const bufLen  = Math.floor(ctx.sampleRate * 0.025);
    const buf     = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data    = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
    const noise     = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    const filter    = ctx.createBiquadFilter();
    noise.buffer    = buf;
    filter.type     = 'bandpass';
    filter.frequency.value = freq * 3;
    filter.Q.value  = 0.8;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(out);
    noiseGain.gain.setValueAtTime(0.12, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.025);
    noise.start(startTime);
    noise.stop(startTime + 0.03);
}

function playMelody(indices, noteDuration = 1.4, gap = 0.55) {
    const ctx = getAudioCtx();
    const now = ctx.currentTime + 0.05;
    indices.forEach((idx, i) => playNote(NOTES[idx].freq, now + i * gap, noteDuration));
}

// Peg placement — short piano note
function playPegPlace(noteIdx) {
    const ctx = getAudioCtx();
    playNote(NOTES[noteIdx].freq, ctx.currentTime + 0.01, 0.55);
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

// Bell synthesis — inharmonic partials with fast attack and long ring
function playBell(freq, startTime, volume = 0.38, ringDuration = 1.8) {
    const ctx = getAudioCtx();
    const out = getOut();

    // Classic bell partial ratios (inharmonic, as in real bells)
    const partials = [
        { ratio: 1.000, v: 1.00 },
        { ratio: 1.470, v: 0.55 },
        { ratio: 1.780, v: 0.35 },
        { ratio: 2.000, v: 0.25 },
        { ratio: 2.756, v: 0.18 },
        { ratio: 3.000, v: 0.10 },
        { ratio: 4.070, v: 0.06 },
    ];

    const master = ctx.createGain();
    master.connect(out);
    master.gain.setValueAtTime(0, startTime);
    master.gain.linearRampToValueAtTime(volume, startTime + 0.004);
    master.gain.exponentialRampToValueAtTime(0.001, startTime + ringDuration);

    partials.forEach(({ ratio, v }) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(master);
        osc.type = 'sine';
        osc.frequency.value = freq * ratio;
        // Higher partials decay faster — gives the bright attack then warm tail
        gain.gain.setValueAtTime(v, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + ringDuration / Math.pow(ratio, 0.7));
        osc.start(startTime);
        osc.stop(startTime + ringDuration + 0.05);
    });
}

// White pegs — softer, muted bell tones (right note, wrong place)
function playWrongPositions(whites) {
    const ctx = getAudioCtx();
    const now = ctx.currentTime + 0.05;
    const freqs = [523.25, 587.33, 659.25, 698.46]; // C5 D5 E5 F5
    for (let i = 0; i < whites; i++) {
        playBell(freqs[i], now + i * 0.22, 0.24, 1.2);
    }
}

// Black pegs — bright ascending bell chimes (right note, right place)
function playCorrectPositions(blacks) {
    const ctx = getAudioCtx();
    const now = ctx.currentTime + 0.05;
    const freqs = [880, 1046.5, 1174.66, 1318.51]; // A5 C6 D6 E6
    for (let i = 0; i < blacks; i++) {
        playBell(freqs[i], now + i * 0.2, 0.42, 2.2);
    }
}

// Mixed result — soft bell chord (some right, some wrong position)
function playMixed() {
    const ctx = getAudioCtx();
    const now = ctx.currentTime + 0.05;
    [523.25, 659.25, 783.99].forEach((f, i) => {
        playBell(f, now + i * 0.06, 0.22, 1.4);
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
    // Ascending piano arpeggio
    [0, 2, 4, 6].forEach((n, i) => {
        playNote(NOTES[n].freq * 2, now + i * 0.16, 1.2);
    });
    // Final chord — root, third, fifth together
    [0, 2, 4].forEach(n => {
        playNote(NOTES[n].freq * 2, now + 0.78, 1.8);
    });
}

function playLose() {
    const ctx = getAudioCtx();
    const now = ctx.currentTime + 0.05;
    // Descending piano notes
    [6, 4, 2, 0].forEach((n, i) => {
        playNote(NOTES[n].freq * 0.5, now + i * 0.28, 1.0);
    });
    // Final low thud
    tone(55, now + 1.2, 0.9, 'sine', 0.45);
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
    return MAX_GUESSES - guessNumber + 1;
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
    $('totalScore').textContent  = totalScore;
    $('bestScore').textContent   = bestGame;
    $('streak').textContent      = streak + (streak >= 3 ? '🔥' : '');
    $('guessesLeft').textContent = MAX_GUESSES - guesses.length;
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
