// Notification sound generator for task reminders
class NotificationSound {
    constructor() {
        this.audioContext = null;
        this.isPlaying = false;
        this.soundInterval = null;
        this.startTime = null;
        this.duration = 30000; // 30 seconds
    }

    async init() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('🔊 Audio context initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize audio context:', error);
            return false;
        }
    }

    // Generate a pleasant notification tone
    createTone(frequency = 800, duration = 0.5) {
        if (!this.audioContext) return null;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Set frequency for a pleasant notification sound
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = 'sine';

        // Create fade in/out envelope
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0.05, this.audioContext.currentTime + duration - 0.1);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);

        return { oscillator, gainNode, duration };
    }

    // Play a sequence of tones for notification
    async playNotificationSequence() {
        if (!this.audioContext) {
            console.log('🔊 Audio context not available');
            return false;
        }

        // Resume audio context if suspended (required by some browsers)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        const currentTime = this.audioContext.currentTime;
        
        // Create a pleasant two-tone notification sound
        const tone1 = this.createTone(800, 0.3);  // Higher pitch
        const tone2 = this.createTone(600, 0.4);  // Lower pitch

        if (tone1 && tone2) {
            // Start first tone immediately
            tone1.oscillator.start(currentTime);
            tone1.oscillator.stop(currentTime + tone1.duration);

            // Start second tone slightly after first
            tone2.oscillator.start(currentTime + 0.2);
            tone2.oscillator.stop(currentTime + 0.2 + tone2.duration);

            return true;
        }

        return false;
    }

    // Start playing notification sound for 30 seconds
    async startNotificationSound() {
        if (this.isPlaying) {
            console.log('🔊 Notification sound already playing');
            return;
        }

        console.log('🔊 Starting notification sound (30 seconds)');
        this.isPlaying = true;
        this.startTime = Date.now();

        // Play initial sound
        await this.playNotificationSequence();

        // Continue playing every 3 seconds for 30 seconds total
        this.soundInterval = setInterval(async () => {
            const elapsed = Date.now() - this.startTime;
            
            if (elapsed >= this.duration) {
                this.stopNotificationSound();
                return;
            }

            await this.playNotificationSequence();
        }, 3000);

        // Auto-stop after 30 seconds as failsafe
        setTimeout(() => {
            if (this.isPlaying) {
                this.stopNotificationSound();
                console.log('🔊 Notification sound auto-stopped after 30 seconds');
            }
        }, this.duration);
    }

    // Stop notification sound
    stopNotificationSound() {
        if (!this.isPlaying) return;

        console.log('🔊 Stopping notification sound');
        this.isPlaying = false;

        if (this.soundInterval) {
            clearInterval(this.soundInterval);
            this.soundInterval = null;
        }

        this.startTime = null;
    }

    // Check if sound is currently playing
    isSoundPlaying() {
        return this.isPlaying;
    }

    // Get remaining time for current notification sound
    getRemainingTime() {
        if (!this.isPlaying || !this.startTime) return 0;
        const elapsed = Date.now() - this.startTime;
        return Math.max(0, this.duration - elapsed);
    }
}

// Export for use in other modules
window.NotificationSound = NotificationSound;
