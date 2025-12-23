"use client";
import { useEffect } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import styles from "./page.module.css";

export default function Home() {
  const { isFrameReady, setFrameReady } = useMiniKit();

  // Initialize the miniapp
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.waitlistForm}>
          <h1 className={styles.title}>SpellCard NFT Creator</h1>
          
          <p className={styles.subtitle}>
            Create and mint unique mystical spell card NFTs with AI-generated art.
            <br />
            <br />
            This app works best as a Farcaster Frame. Share the Frame URL to start creating!
          </p>

          <div style={{ marginTop: "2rem" }}>
            <p>Frame URL: <code>/api/frame</code></p>
            <p style={{ fontSize: "0.9rem", color: "#666", marginTop: "1rem" }}>
              To use this Frame:
              <br />
              1. Select an element (Fire, Water, Earth, etc.)
              <br />
              2. Choose a style (Chaos, Order, Nature, Dark)
              <br />
              3. Enter a keyword (e.g., "Rage")
              <br />
              4. Generate your spell card
              <br />
              5. Mint as NFT for 0.001 ETH
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
