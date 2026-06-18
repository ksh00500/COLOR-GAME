let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined" || window.AudioContext === undefined) {
    return null;
  }

  audioContext ??= new window.AudioContext();
  return audioContext;
};

export const playOpponentTurnCue = async (): Promise<void> => {
  const context = getAudioContext();
  if (context === null) return;

  if (context.state === "suspended") {
    await context.resume().catch(() => undefined);
  }

  const startAt = context.currentTime;
  const output = context.createGain();
  const compressor = context.createDynamicsCompressor();
  output.gain.setValueAtTime(0.9, startAt);
  compressor.threshold.setValueAtTime(-18, startAt);
  compressor.knee.setValueAtTime(16, startAt);
  compressor.ratio.setValueAtTime(4, startAt);
  compressor.attack.setValueAtTime(0.003, startAt);
  compressor.release.setValueAtTime(0.2, startAt);
  output.connect(compressor);
  compressor.connect(context.destination);

  const notes = [
    { frequency: 523.25, offset: 0 },
    { frequency: 783.99, offset: 0.11 },
    { frequency: 1046.5, offset: 0.22 },
  ];

  for (const note of notes) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(note.frequency, startAt + note.offset);
    gain.gain.setValueAtTime(0.0001, startAt + note.offset);
    gain.gain.exponentialRampToValueAtTime(0.17, startAt + note.offset + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + note.offset + 0.29);
    oscillator.connect(gain);
    gain.connect(output);
    oscillator.start(startAt + note.offset);
    oscillator.stop(startAt + note.offset + 0.32);
  }
};
