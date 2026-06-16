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
  const notes = [
    { frequency: 523.25, offset: 0 },
    { frequency: 783.99, offset: 0.105 },
  ];

  for (const note of notes) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(note.frequency, startAt + note.offset);
    gain.gain.setValueAtTime(0.0001, startAt + note.offset);
    gain.gain.exponentialRampToValueAtTime(0.075, startAt + note.offset + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + note.offset + 0.24);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt + note.offset);
    oscillator.stop(startAt + note.offset + 0.28);
  }
};
