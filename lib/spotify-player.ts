"use client";
import { SpotifyUser } from "@/types";

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Spotify: any;
  }
}

export class SpotifyPlayer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private player: any = null;
  private isReady = false;
  private deviceId: string | null = null;
  onTokenRefresh: ((token: string) => void) | null = null;

  constructor(private user: SpotifyUser) {}

  private async getFreshToken(): Promise<string> {
    try {
      const res = await fetch(`/api/spotify/refresh?refresh_token=${encodeURIComponent(this.user.refreshToken)}`);
      if (!res.ok) return this.user.accessToken;
      const data = await res.json();
      this.user = { ...this.user, accessToken: data.access_token };
      this.onTokenRefresh?.(data.access_token);
      return data.access_token;
    } catch {
      return this.user.accessToken;
    }
  }

  async initialize(): Promise<void> {
    if (this.isReady) return;

    // Load Spotify Web Playback SDK
    await this.loadSDK();

    return new Promise((resolve, reject) => {
      window.onSpotifyWebPlaybackSDKReady = () => {
        this.player = new window.Spotify.Player({
          name: "Priority Compass",
          getOAuthToken: (cb: (token: string) => void) => {
            this.getFreshToken().then(cb);
          },
          volume: 0.5,
        });

        this.player.addListener("ready", ({ device_id }: { device_id: string }) => {
          this.deviceId = device_id;
          this.isReady = true;
          console.log("Spotify player ready with device ID:", device_id);
          resolve();
        });

        this.player.addListener("not_ready", ({ device_id }: { device_id: string }) => {
          console.log("Spotify player not ready with device ID:", device_id);
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.player.addListener("player_state_changed", (state: any) => {
          if (!state) return;
          console.log("Player state changed:", state);
        });

        this.player.addListener("initialization_error", ({ message }: { message: string }) => {
          console.error("Spotify player initialization error:", message);
          reject(new Error(message));
        });

        this.player.addListener("authentication_error", ({ message }: { message: string }) => {
          console.error("Spotify player authentication error:", message);
          reject(new Error(message));
        });

        this.player.connect();
      };

      // If SDK is already loaded, trigger ready callback
      if (window.Spotify) {
        window.onSpotifyWebPlaybackSDKReady();
      }
    });
  }

  private async loadSDK(): Promise<void> {
    return new Promise((resolve) => {
      if (window.Spotify) {
        resolve();
        return;
      }

      // Set up global callback before loading script
      window.onSpotifyWebPlaybackSDKReady = () => {
        // This will be called by the SDK when ready
        // The actual initialization happens in initialize() method
      };

      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      script.onload = () => {
        // Small delay to ensure SDK is fully loaded
        setTimeout(resolve, 100);
      };
      document.body.appendChild(script);
    });
  }

  async playTrack(trackUri: string): Promise<void> {
    if (!this.isReady || !this.deviceId) {
      throw new Error("Spotify player not ready");
    }

    try {
      // First, transfer playback to this device
      await fetch(`https://api.spotify.com/v1/me/player`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.user.accessToken}`,
        },
        body: JSON.stringify({
          device_ids: [this.deviceId],
          play: true,
        }),
      });

      // Then play the specific track on this device
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.user.accessToken}`,
        },
        body: JSON.stringify({
          uris: [trackUri],
        }),
      });
    } catch (error) {
      console.error("Failed to play track:", error);
      throw error;
    }
  }

  async pause(): Promise<void> {
    if (!this.isReady) return;

    try {
      await fetch(`https://api.spotify.com/v1/me/player/pause`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.user.accessToken}`,
        },
      });
    } catch (error) {
      console.error("Failed to pause:", error);
      throw error;
    }
  }

  async resume(): Promise<void> {
    if (!this.isReady) return;

    try {
      await fetch(`https://api.spotify.com/v1/me/player/play`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.user.accessToken}`,
        },
      });
    } catch (error) {
      console.error("Failed to resume:", error);
      throw error;
    }
  }

  async setVolume(volume: number): Promise<void> {
    if (!this.isReady) return;

    try {
      await fetch(`https://api.spotify.com/v1/me/player/volume`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.user.accessToken}`,
        },
        body: JSON.stringify({
          volume_percent: Math.round(volume * 100),
        }),
      });
    } catch (error) {
      console.error("Failed to set volume:", error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.player) {
      this.player.disconnect();
      this.player = null;
      this.isReady = false;
      this.deviceId = null;
    }
  }

  getIsReady(): boolean {
    return this.isReady;
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }
}
