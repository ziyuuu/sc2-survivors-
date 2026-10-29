"""Render the requested BGM arrangement auditions; never modifies the game.

Python 3 + numpy, and a local ffmpeg. Melodies paraphrase Dvorak Op.95;
all accompanying parts and synthesized timbres are made for this audition.
No recordings, soundfonts, sample packs, or third-party MIDI are used.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import wave

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SR = 44100
TAU = 2 * np.pi
RNG = np.random.default_rng(10292026)
TABLE_SIZE = 16384
TABLES: dict[tuple[str, int], np.ndarray] = {}


def midi(name: str | int) -> int:
    if isinstance(name, int):
        return name
    match = re.fullmatch(r'([A-G])([b#]?)(-?\d+)', name)
    if not match:
        raise ValueError(name)
    letter, accidental, octave = match.groups()
    return 12 * (int(octave) + 1) + {'C': 0, 'D': 2, 'E': 4, 'F': 5,
                                   'G': 7, 'A': 9, 'B': 11}[letter] + {'': 0, 'b': -1, '#': 1}[accidental]


def table(kind: str, pitch: int) -> np.ndarray:
    key = kind, pitch
    if key in TABLES:
        return TABLES[key]
    freq = 440 * 2 ** ((pitch - 69) / 12)
    phase = np.arange(TABLE_SIZE, dtype=np.float64) * TAU / TABLE_SIZE
    result = np.zeros(TABLE_SIZE)
    for h in range(1, min(28, int(15000 / freq)) + 1):
        if kind == 'string':
            gain = math.exp(-h / 7) / h ** .95
        elif kind == 'brass':
            gain = math.exp(-h / 6.5) / h ** .75 * (1 if h < 8 else .6)
        elif kind == 'pad':
            gain = math.exp(-h / 3.2) / h ** 1.5
        elif kind == 'reed':
            gain = (1 if h % 2 else .38) * math.exp(-h / 5) / h ** 1.1
        elif kind == 'bass':
            gain = math.exp(-h / 4) / h ** 1.8
        else:
            gain = math.exp(-h / 4) / h ** 1.3
        result += gain * np.sin(h * phase)
    result /= max(1., float(np.max(np.abs(result))))
    TABLES[key] = result.astype(np.float32)
    return TABLES[key]


def oscillator(waveform: np.ndarray, cycles: np.ndarray) -> np.ndarray:
    pos = np.remainder(cycles, 1) * TABLE_SIZE
    lo = pos.astype(np.int32)
    fract = pos - lo
    return waveform[lo] * (1 - fract) + waveform[(lo + 1) % TABLE_SIZE] * fract


def envelope(t: np.ndarray, hold: float, attack: float, release: float,
             decay: float = 0) -> np.ndarray:
    a = np.sin(np.minimum(1., t / attack) * np.pi / 2) ** 2
    r = np.exp(-5.8 * np.maximum(0, t - hold) / release)
    if decay:
        a *= .22 + .78 * np.exp(-t * decay)
    return a * r


def tonal(kind: str, pitch: int, hold: float) -> np.ndarray:
    params = {'pad': (.65, 1.9), 'string': (.16, .85),
              'brass': (.06, .42), 'reed': (.07, .55),
              'bass': (.012, .18), 'pluck': (.004, .7), 'bell': (.008, 1.5)}
    attack, release = params[kind]
    t = np.arange(round((hold + release) * SR), dtype=np.float64) / SR
    f = 440 * 2 ** ((pitch - 69) / 12)
    phi = RNG.random() * TAU
    vibrato = .0015 * (1 - np.exp(-t * 3)) * np.sin(TAU * 5.1 * t + phi)
    cycles = f * t + (f * .0015 / (TAU * 5.1)) * np.cos(TAU * 5.1 * t + phi)
    if kind in ('pluck', 'bell'):
        mod = np.sin(TAU * f * (2 if kind == 'pluck' else 2.002) * t)
        sound = np.sin(TAU * f * t + (1.5 if kind == 'pluck' else .8) * np.exp(-t * 3.2) * mod)
        sound += .14 * np.sin(TAU * f * 3.01 * t) * np.exp(-t * 5)
        sound *= np.exp(-t * (2.8 if kind == 'pluck' else 1.2))
        stereo = np.column_stack((sound, sound))
    else:
        wav = table(kind, pitch)
        if kind in ('pad', 'string'):
            cents = [-7., -3., 2., 6.] if kind == 'string' else [-4., 3.]
            stereo = np.zeros((len(t), 2), dtype=np.float64)
            for idx, cent in enumerate(cents):
                jitter = .0007 * np.sin(TAU * (.2 + idx * .06) * t + phi)
                voice = oscillator(wav, cycles * 2 ** (cent / 1200) + jitter + RNG.random())
                pan = .2 + .6 * idx / max(1, len(cents) - 1)
                stereo[:, 0] += voice * np.cos(pan * np.pi / 2) / len(cents)
                stereo[:, 1] += voice * np.sin(pan * np.pi / 2) / len(cents)
            stereo *= 1 + .05 * np.sin(TAU * .8 * t[:, None] + phi)
        else:
            sound = oscillator(wav, cycles)
            if kind == 'brass':
                # Rounded initial attack opens into a brighter sustained tone.
                sound = .28 * np.sin(TAU * cycles) + sound * (.55 + .45 * (1 - np.exp(-t * 9)))
            if kind == 'reed':
                sound = .68 * sound + .32 * np.sin(TAU * cycles)
            if kind == 'bass':
                sound = .7 * sound + .3 * np.sin(TAU * f * t)
            stereo = np.column_stack((sound, sound))
    env = envelope(t, hold, min(attack, hold / 2), release, 3 if kind == 'bass' else 0)
    return (stereo * env[:, None]).astype(np.float32)


def percussion(kind: str, pitch: int = 40) -> np.ndarray:
    duration = {'kick': .6, 'tom': 1.1, 'snare': .24, 'hat': .11, 'air': 2.1}[kind]
    t = np.arange(int(duration * SR)) / SR
    noise = RNG.normal(0, 1, len(t))
    if kind == 'kick':
        phase = 49 * t + 78 * .027 * (1 - np.exp(-t / .027))
        x = np.sin(TAU * phase) * np.exp(-t * 8) + .07 * noise * np.exp(-t * 160)
    elif kind == 'tom':
        f = 440 * 2 ** ((pitch - 69) / 12)
        x = sum(np.sin(TAU * f * ratio * t) * np.exp(-t * decay) * gain
                for ratio, decay, gain in [(1, 5, 1), (1.51, 7, .27), (2.04, 9, .18)])
        x += .045 * noise * np.exp(-t * 60)
    elif kind == 'snare':
        noise = (noise + np.roll(noise, 1) + np.roll(noise, 2)) / 3
        x = .6 * noise * np.exp(-t * 22) + .25 * np.sin(TAU * 175 * t) * np.exp(-t * 20)
    elif kind == 'hat':
        x = (noise - np.roll(noise, 1)) * np.exp(-t * 60) * .27
    else:
        noise = np.convolve(noise, np.ones(18) / 18, mode='same')
        x = noise * (1 - np.exp(-t * 10)) * np.exp(-t * 2.5) * .65
    x *= np.minimum(1., t / .002)
    return np.column_stack((x, x)).astype(np.float32)


class Track:
    def __init__(self, bpm: float, bars: int):
        self.beat = 60 / bpm
        self.length = bars * 4 * self.beat
        self.audio = np.zeros((round((self.length + 3.5) * SR), 2), np.float32)
        self.events = []

    def put(self, sound: np.ndarray, start: float, gain: float, pan: float = 0):
        at = round(start * self.beat * SR)
        if at < 0:
            raise ValueError('Negative event time')
        length = min(len(sound), len(self.audio) - at)
        gains = np.array([math.sqrt(1 - max(0, pan)), math.sqrt(1 + min(0, pan))])
        self.audio[at:at + length] += sound[:length] * gain * gains

    def note(self, kind: str, name: str | int, start: float, duration: float,
             gain: float, pan: float = 0):
        pitch = midi(name)
        self.put(tonal(kind, pitch, duration * self.beat), start, gain, pan)
        self.events.append([kind, pitch, round(start, 4), round(duration, 4), gain])

    def drum(self, kind: str, start: float, gain: float, pitch: int = 40, pan: float = 0):
        self.put(percussion(kind, pitch), start, gain, pan)
        self.events.append([kind, pitch, round(start, 4), 0, gain])

    def phrase(self, bars: list, start: int, kind: str, gain: float, octave: int = 0):
        for idx, bar in enumerate(bars):
            beat = (start + idx) * 4
            assert abs(sum(note[1] for note in bar) - 4) < .001, bar
            for name, dur in bar:
                if name != '-':
                    self.note(kind, midi(name) + octave * 12, beat,
                              dur * .95, gain * RNG.uniform(.94, 1.03))
                beat += dur

    def finish(self, reverb: float, echo: float, loop: bool = False) -> np.ndarray:
        dry = self.audio
        wet = np.zeros_like(dry)
        # Deterministic stereo early reflections and a decaying diffusion tail.
        for idx, (seconds, gain) in enumerate([(0.067, .25), (.101, .22), (.149, .18),
                                               (.233, .15), (.347, .13), (.467, .11),
                                               (.619, .085), (.811, .065), (1.023, .045),
                                               (1.281, .026), (1.611, .018)]):
            offset = round(seconds * SR)
            src = dry[:-offset, ::-1] if idx % 2 else dry[:-offset]
            wet[offset:] += gain * src
        for repeat in range(1, 4):
            offset = round(self.beat * 1.5 * repeat * SR)
            wet[offset:] += echo * .4 ** repeat * dry[:-offset, ::-1]
        audio = dry + wet * reverb
        # Fold release/reverb tails into the following cycle. This preserves the
        # actual continuation at the loop boundary instead of fading to silence.
        if loop:
            count = round(self.length * SR)
            tail = audio[count:].copy()
            audio = audio[:count].copy()
            audio[:len(tail)] += tail
        audio -= np.mean(audio, axis=0, keepdims=True)
        if not loop:
            fade_in = round(.2 * SR)
            audio[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
            fade_out = round(2.3 * SR)
            audio[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None] ** 1.4
        peak = float(np.max(np.abs(audio)))
        audio *= .74 / max(peak, 1e-6)
        assert np.isfinite(audio).all()
        return audio


def menu(score: dict, full: bool = False) -> Track:
    t = Track(score['bpm'], 60 if full else 24)
    # Concert pitch; the source trumpet line is written for trumpet in E.
    phrase = score['theme']
    chords = [(['E3', 'G3', 'B3', 'F#4'], 'E2'),
              (['E3', 'G3', 'B3', 'E4'], 'E2'),
              (['D3', 'G3', 'B3', 'E4'], 'G2'),
              (['E3', 'G3', 'B3', 'E4'], 'E2'),
              (['E3', 'G3', 'B3', 'C4'], 'C2'),
              (['E3', 'A3', 'C4', 'F#4'], 'A2'),
              (['D#3', 'A3', 'B3', 'F#4'], 'B1'),
              (['E3', 'G3', 'B3', 'F#4'], 'E2')]
    intro = [chords[0], chords[0], chords[4], chords[6]]
    bridge = [chords[4], chords[5], chords[2], chords[6]]
    progression = intro + chords + bridge + chords
    if full:
        progression += chords + bridge + bridge + chords + chords + bridge
    for bar, (notes, root) in enumerate(progression):
        b = bar * 4
        active = bar >= 4 and not (full and (24 <= bar < 32 or 48 <= bar < 60))
        for idx, n in enumerate(notes):
            t.note('pad', n, b, 4.15, .043 if active else .06, (idx - 1.5) * .27)
            if 16 <= bar < 24 or 40 <= bar < 48:
                t.note('string', midi(n) + 12, b, 3.85, .024, (idx - 1.5) * .2)
        if bar >= 2:
            for step in range(8):
                n = midi(notes[[0, 2, 1, 2, 0, 2, 3, 2][step]]) + 12
                t.note('pluck', n, b + step * .5, .34,
                       .026 if not active else .043, -.3 if step % 2 else .3)
        bass = midi(root)
        for beat, duration, amount in [(0, .85, .12), (1.5, .35, .07),
                                       (2, .85, .1), (3.5, .35, .07)]:
            if active:
                t.note('bass', bass, b + beat, duration, amount)
        if not active:
            t.note('bass', bass, b, 3.8, .08)
        if active:
            t.drum('kick', b, .17)
            t.drum('kick', b + 2.5, .11)
            if bar >= 8:
                t.drum('snare', b + 1, .07)
                t.drum('snare', b + 3, .085)
            for step in range(8):
                t.drum('hat', b + .5 * step, .029 if step % 2 else .021, pan=.22)
            if bar % 4 == 3:
                t.drum('tom', b + 3, .08, midi(root) + 12, -.2)
                t.drum('tom', b + 3.5, .055, midi(root) + 19, .2)
        if bar in (4, 16, 40):
            t.drum('air', b, .16)
            t.drum('tom', b, .14, midi('E2'))
    t.phrase(phrase, 4, 'brass', .105)
    t.phrase(phrase, 16, 'brass', .09, octave=1)
    t.phrase(phrase, 16, 'string', .028)
    # New contrasting bridge; not represented as an original Dvorak passage.
    bridge_notes = [[['G4', 1.5], ['B4', .5], ['E5', 2]],
                    [['C5', 1.5], ['B4', .5], ['A4', 2]],
                    [['B4', 2], ['A4', 1], ['G4', 1]],
                    [['F#4', 1.5], ['D#4', .5], ['B3', 2]]]
    t.phrase(bridge_notes, 12, 'reed', .065)
    if full:
        t.phrase(phrase, 24, 'reed', .054)
        t.phrase(bridge_notes, 32, 'reed', .06)
        t.phrase(bridge_notes, 36, 'string', .046)
        t.phrase(phrase, 40, 'brass', .085, octave=1)
        t.phrase(phrase, 40, 'string', .027)
        # The final eight bars become sparser before the harmony returns to E.
        t.phrase(phrase[:4], 48, 'reed', .047)
    return t


def intermission(score: dict, full: bool = False) -> Track:
    t = Track(score['bpm'], 32 if full else 16)
    chords = [(['Db3', 'F3', 'Ab3', 'Eb4'], 'Db2'),
              (['C3', 'Eb3', 'Ab3', 'Bb3'], 'Ab2'),
              (['Db3', 'F3', 'Ab3', 'Eb4'], 'Db2'),
              (['Db3', 'F3', 'Ab3', 'Db4'], 'Db2'),
              (['Db3', 'Gb3', 'Bb3', 'F4'], 'Gb2'),
              (['Eb3', 'Gb3', 'Bb3', 'Db4'], 'Eb2'),
              (['Db3', 'Gb3', 'Bb3', 'F4'], 'Gb2'),
              (['C3', 'Eb3', 'Ab3', 'Bb3'], 'Ab2')]
    progression = [chords[0], chords[1]] + chords + chords[:4] + [chords[1], chords[0]]
    if full:
        progression = [chords[0], chords[1]] + chords + chords[:4] + chords[4:] + [chords[0], chords[1]] + chords + [chords[1], chords[0], chords[1], chords[0]]
    for bar, (notes, root) in enumerate(progression):
        b = bar * 4
        for idx, n in enumerate(notes):
            t.note('pad', n, b, 4.1, .045, (idx - 1.5) * .28)
            if bar >= 6:
                t.note('string', midi(n) + 12, b + .03, 3.9, .012, (idx - 1.5) * .35)
        t.note('bass', root, b, 3.7, .067)
        for step in range(4):
            n = midi(notes[[0, 2, 1, 3][step]]) + 12
            t.note('pluck', n, b + step + .5, .65, .027, -.35 if step % 2 else .35)
        if bar % 2 == 0:
            t.note('bell', midi(notes[2]) + 24, b, 1.7, .013, .4)
        if 4 <= bar < 14 or 20 <= bar < 28:
            t.drum('kick', b, .042)
            t.drum('hat', b + 1.5, .017, pan=.3)
            t.drum('hat', b + 3.5, .014, pan=-.3)
    t.phrase(score['theme'], 2, 'reed', .093)
    t.phrase(score['theme'][:4], 10, 'reed', .083)
    t.phrase(score['theme'][:4], 10, 'string', .018, octave=1)
    if full:
        t.phrase(score['theme'], 20, 'reed', .082)
        t.phrase(score['theme'][:4], 20, 'string', .016, octave=1)
    return t


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=ROOT / 'reports/local/bgm-audition-20261029')
    parser.add_argument('--ffmpeg', type=Path, default=ROOT / 'sites/v04-compression-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe')
    parser.add_argument('--full', action='store_true', help='Render approved full-length cyclic arrangements')
    args = parser.parse_args()
    args.output = args.output.resolve()
    args.output.mkdir(parents=True, exist_ok=True)
    source = ROOT / 'preview/bgm-audition-20261029/arrangements.json'
    data = json.loads(source.read_text(encoding='utf-8'))
    result = {'sampleRate': SR, 'sources': data['sources'], 'tracks': []}
    for key, render in [('menu', menu), ('intermission', intermission)]:
        spec = data[key]
        track = render(spec, args.full)
        samples = track.finish(.65 if key == 'menu' else .85, .2 if key == 'menu' else .35, args.full)
        raw = args.output / f'{key}-render.wav'
        with wave.open(str(raw), 'wb') as wav:
            wav.setnchannels(2)
            wav.setsampwidth(2)
            wav.setframerate(SR)
            wav.writeframes((np.clip(samples, -1, 1) * 32767).astype('<i2').tobytes())
        output = args.output / f'{key}-new-world-{"loop" if args.full else "demo"}.mp3'
        loudness = -20 if key == 'menu' else -22
        filters = f'highpass=f=34,lowpass=f=14000,loudnorm=I={loudness}:TP=-2:LRA=8:print_format=json'
        measured = None
        if args.full:
            # Fixed gain keeps the master level periodic across the seam.
            measurement = subprocess.run([str(args.ffmpeg), '-hide_banner', '-nostdin', '-i', str(raw),
                                          '-af', 'loudnorm=print_format=json', '-f', 'null', '-'],
                                         capture_output=True, text=True, encoding='utf-8', check=True)
            measured = json.loads(re.search(r'\{\s*"input_i".*?\}', measurement.stderr, re.S).group(0))
            gain = min(loudness - float(measured['input_i']), -2 - float(measured['input_tp']))
            filters = f'volume={gain:.6f}dB'
        process = subprocess.run([str(args.ffmpeg), '-hide_banner', '-nostdin', '-y', '-i', str(raw),
                                  '-af', filters,
                                  '-ar', str(SR), '-codec:a', 'libmp3lame', '-q:a', '2',
                                  '-metadata', f'title={spec["title"]}',
                                  '-metadata', 'artist=SC2 Survivors arrangement audition',
                                  '-metadata', 'comment=Theme: Antonin Dvorak Op.95; freshly synthesized arrangement; no third-party recording or sample library.',
                                  str(output)], capture_output=True, text=True, encoding='utf-8', errors='replace', check=True)
        match = re.search(r'\{\s*"input_i".*?\}', process.stderr, re.S)
        metrics = json.loads(match.group(0)) if match else None
        report = {'id': key, 'title': spec['title'], 'bpm': spec['bpm'],
                  'seconds': round(len(samples) / SR, 3), 'musicalEvents': len(track.events),
                  'file': str(output.relative_to(ROOT)).replace('\\', '/'),
                  'bytes': output.stat().st_size,
                  'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'normalization': metrics,
                  'loop': args.full, 'loopSamples': len(samples) if args.full else None,
                  'pcmSeamStep': float(np.max(np.abs(samples[-1] - samples[0]))),
                  'fixedGainDb': gain if args.full else None, 'measuredBeforeGain': measured}
        result['tracks'].append(report)
        raw.unlink()  # This exact intermediate was created above, after successful encoding.
        print(json.dumps(report, ensure_ascii=True), flush=True)
    (args.output / 'render-result.json').write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
