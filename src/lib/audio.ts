class SynthEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;

  init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.ctx.destination);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 0.5;
    }
    return this.isMuted;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol = 1) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    
    // Resume context if suspended (browser autoplay policy)
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Plinko ball hitting a peg
  playTick() {
    this.playTone(800 + Math.random() * 200, 'sine', 0.05, 0.3);
  }

  // Mines gem found
  playGem() {
    this.playTone(1200, 'sine', 0.1, 0.4);
    setTimeout(() => this.playTone(1800, 'sine', 0.2, 0.4), 100);
  }

  // Mines bomb found
  playBomb() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  // Cashout / Win
  playCashout() {
    this.playTone(600, 'sine', 0.1, 0.5);
    setTimeout(() => this.playTone(800, 'sine', 0.1, 0.5), 100);
    setTimeout(() => this.playTone(1200, 'sine', 0.4, 0.6), 200);
  }

  // Aviator ascending
  playAscend(multiplier: number) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    // Cap frequency so it doesn't pierce ears
    const freq = Math.min(200 + (multiplier * 20), 1000); 
    this.playTone(freq, 'triangle', 0.1, 0.05);
  }
}

// Export singleton
export const audioSystem = new SynthEngine();
