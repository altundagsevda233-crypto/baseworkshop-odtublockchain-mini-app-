"use client";
import React, { useState, useRef, useEffect } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import {
  Wallet,
  ConnectWallet,
  WalletDropdown,
  WalletDropdownDisconnect,
  WalletDropdownLink
} from "@coinbase/onchainkit/wallet";
import { Address, Avatar, Name, Identity, EthBalance } from "@coinbase/onchainkit/identity";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useSwitchChain } from "wagmi";
import { parseEther } from "viem";
import styles from "./page.module.css";

// Minimal ABI for SpellDeck
const CONTRACT_ABI = [
  {
    "type": "function",
    "name": "mintSpell",
    "inputs": [{ "name": "tokenURI", "type": "string", "internalType": "string" }],
    "outputs": [],
    "stateMutability": "payable"
  }
];

// MANUAL FIX: Hardcoded address to bypass environment variable issues
const CONTRACT_ADDRESS = "0xd9E214FE6Eca6ADa561363c77988a074b7223088";

export default function Home() {
  const { isFrameReady, setFrameReady } = useMiniKit();

  // Wagmi Hooks
  const { address, chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Debugging
  useEffect(() => {
    console.log("Current Chain ID:", chainId);
    console.log("Is Connected:", isConnected);
    if (isConnected && chainId && chainId !== 84532) {
      console.log("Wrong network! Attempting auto-switch...");
      switchChain({ chainId: 84532 });
    }
  }, [chainId, isConnected, switchChain]);

  // Form State
  const [element, setElement] = useState("Fire");
  const [style, setStyle] = useState("Chaos");
  const [keyword, setKeyword] = useState("");

  // Loading & Result State
  const [loadingState, setLoadingState] = useState<"idle" | "generating" | "uploading" | "complete">("idle");
  const [generatedCard, setGeneratedCard] = useState<string | null>(null);
  const [metadataUrl, setMetadataUrl] = useState<string | null>(null);
  const [shareableImage, setShareableImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 3D Tilt Refs
  const cardRef = useRef<HTMLDivElement>(null);

  // Initialize MiniKit
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // Handle 3D Tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !generatedCard) return;

    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10; // Max 10deg rotation
    const rotateY = ((x - centerX) / centerX) * 10;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!cardRef.current || !generatedCard) return;

    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10; // Max 10deg rotation
    const rotateY = ((x - centerX) / centerX) * 10;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const handleTouchEnd = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
    }
  };

  // Handle Generation
  const handleGenerate = async () => {
    if (!keyword) {
      setError("Please enter a keyword for your spell.");
      return;
    }

    setError(null);
    setLoadingState("generating");

    try {
      const response = await fetch("/api/generate-spell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ element, style, keyword }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server API Error:", errorData);
        throw new Error(errorData.error || errorData.details || "Failed to generate spell");
      }

      const data = await response.json();
      setLoadingState("uploading");

      if (data.success) {
        // FORCE PREVIEW: Use Base64 if available (100% Works), then Pollinations link
        const previewImage = data.base64 || data.previewUrl || data.imageUrl;
        console.log("Setting Preview Image (Source):", data.base64 ? "Base64" : "URL");

        setGeneratedCard(previewImage);

        // For sharing, prefer the hosted URL (IPFS) or the Pollinations URL
        // NEVER share Base64 as it breaks URL limits (Error 414)
        setShareableImage(data.imageUrl || data.previewUrl);

        setMetadataUrl(data.metadataUrl);
        setLoadingState("complete");
      }
    } catch (err: unknown) {
      console.error("Generation Error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong creating the spell.");
      }
      setLoadingState("idle");
    }
  };

  // Handle Minting
  const handleMint = async () => {
    if (!metadataUrl) {
      setError("No spell metadata found. Generate a spell first!");
      return;
    }

    // Safety check mostly for development, since we hardcoded it above
    if (!CONTRACT_ADDRESS) {
      const msg = "Critical Error: Contract address missing.";
      setError(msg);
      alert(msg);
      return;
    }

    try {
      console.log("Minting with:", {
        address: CONTRACT_ADDRESS,
        tokenURI: metadataUrl
      });

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "mintSpell",
        args: [metadataUrl],
        value: parseEther("0.001"),
        chainId: 84532, // Explicitly enforce chainId in transaction
      });
    } catch (err) {
      console.error("Mint error:", err);
      setError("Failed to initiate mint transaction.");
    }
  };

  // --------------------------------------------------------------------------------
  // NETWORK SHIELD: Block usage if on wrong network
  // --------------------------------------------------------------------------------
  // We check if connected AND chainId is defined AND chainId is not 84532
  // We also check if chainId is just missing despite being connected (edge case)


  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.walletContainer}>
          <Wallet>
            <ConnectWallet className={styles.connectButton}>
              <Avatar className="h-6 w-6" />
              <Name />
            </ConnectWallet>
            <WalletDropdown>
              <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                <Avatar />
                <Name />
                <Address />
                <EthBalance />
              </Identity>
              <WalletDropdownLink icon="link" href="https://wallet.coinbase.com">
                Wallet
              </WalletDropdownLink>
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        </div>
      </header>

      <div className={styles.content}>

        {/* Left Side: Form */}
        <div className={styles.waitlistForm}>
          <h1 className={styles.title}>Grimoire</h1>
          <p className={styles.subtitle}>Forge your Spell Card</p>

          <div className={styles.formGroup}>
            <label className={styles.label}>Element</label>
            <select
              className={styles.select}
              value={element}
              onChange={(e) => setElement(e.target.value)}
            >
              {["Fire", "Water", "Earth", "Air", "Shadow", "Light", "Arcane", "Nature"].map(el => (
                <option key={el} value={el}>{el}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Style</label>
            <select
              className={styles.select}
              value={style}
              onChange={(e) => setStyle(e.target.value)}
            >
              {["Chaos", "Order", "Ancient", "Ethereal", "Dark Fantasy"].map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Essence Keyword</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Rage, Hope, Doom..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          {/* Status Messages for Minting */}
          {hash && <div className={styles.metadata}><p style={{ color: '#34d399' }}>Transaction sent! Hash: {hash.slice(0, 10)}...</p></div>}
          {isConfirming && <div className={styles.metadata}><p style={{ color: '#facc15' }}>Confirming transaction...</p></div>}
          {isConfirmed && <div className={styles.metadata}><p style={{ color: '#34d399' }}>Spell Minted Successfully! ✨</p></div>}

          <button
            className={styles.generateButton}
            onClick={handleGenerate}
            disabled={loadingState === "generating" || loadingState === "uploading" || isPending}
          >
            {loadingState === "idle" || loadingState === "complete" ? "Conjure Spell" : "Conjuring..."}
          </button>

          {/* Loading Animation */}
          {(loadingState === "generating" || loadingState === "uploading") && (
            <div className={styles.loadingContainer}>
              <p className={styles.loadingText}>
                {loadingState === "generating" ? "Weaving magic..." : "Inscribing to IPFS..."}
              </p>
              <div className={styles.progressBarContainer}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: loadingState === "generating" ? "50%" : "90%" }}
                ></div>
              </div>
            </div>
          )}

          {loadingState === "complete" && (
            <div className={styles.metadata}>
              <h3>Spell Inscribed</h3>
              <p>Your spell has been forged.</p>

              <div style={{ display: 'flex', gap: '1rem' }}>
                {!isConnected ? (
                  <ConnectWallet className={styles.mintButton}>
                    Connect to Mint
                  </ConnectWallet>
                ) : (
                  <button
                    className={styles.mintButton}
                    onClick={handleMint}
                    disabled={isPending || isConfirming}
                  >
                    {isPending ? "Confirming..." : "Mint NFT (0.001 ETH)"}
                  </button>
                )}

                <button
                  className={styles.shareButton}
                  style={{ marginTop: '1rem', flex: 1 }}
                  onClick={() => {
                    const text = encodeURIComponent(`Behold! I have forged a new ${element} spell card: "${keyword}". 🪄✨\n\nMint yours now!`);
                    // Use shareableImage if available, fallback to placeholder. DO NOT use generatedCard (Base64).
                    const embed = encodeURIComponent(shareableImage || "https://upload.wikimedia.org/wikipedia/commons/d/d1/Image_not_available.png");
                    window.open(`https://warpcast.com/~/compose?text=${text}&embeds[]=${embed}`, '_blank', 'noopener,noreferrer');
                  }}
                >
                  Share
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Preview */}
        <div className={styles.previewContainer}>
          {generatedCard ? (
            <div
              className={styles.cardWrapper}
              ref={cardRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={generatedCard}
                alt="Generated Spell Card"
                className={styles.cardImage}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  console.error("Image Failed:", target.src);
                  target.src = "https://placehold.co/1024x1024/000000/ffd700?text=Load+Failed";
                }}
              />
            </div>
          ) : (
            <div className={styles.placeholderCard}>
              <p>The Grimoire awaits your command...</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
