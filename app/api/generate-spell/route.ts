import { NextRequest, NextResponse } from "next/server";

// Verify Pinata JWT exists
const PINATA_JWT = process.env.PINATA_JWT?.trim();

// Setup Headers for Pinata API
const getPinataHeaders = () => ({
  Authorization: `Bearer ${PINATA_JWT}`,
});

interface GenerateSpellRequest {
  element: string;
  style: string;
  keyword: string;
}

// Rarity Logic
type Rarity = "Common" | "Rare" | "Legendary";

function determineRarity(): Rarity {
  const rand = Math.random() * 100;
  if (rand < 10) return "Legendary"; // 10%
  if (rand < 40) return "Rare";      // 30%
  return "Common";                   // 60%
}

export async function POST(request: NextRequest) {
  console.log("Processing spell generation request...");

  if (!PINATA_JWT) {
    console.error("PINATA_JWT is missing from environment variables.");
    return NextResponse.json(
      { error: "Server configuration error: Pinata not configured." },
      { status: 500 }
    );
  }

  try {
    const body: GenerateSpellRequest = await request.json();
    const { element, style, keyword } = body;

    console.log(`Inputs - Element: ${element}, Style: ${style}, Keyword: ${keyword}`);

    if (!element || !style || !keyword) {
      return NextResponse.json(
        { error: "Missing required fields: element, style, keyword" },
        { status: 400 }
      );
    }

    // 1. Determine Rarity
    const rarity = determineRarity();
    console.log(`Determined Rarity: ${rarity}`);

    // 2. Prompt Engineering
    let rarityDesc = "";
    switch (rarity) {
      case "Legendary": rarityDesc = "masterpiece, golden aura, intricate gold detailed border, elite magical aesthetics, glowing divine particles"; break;
      case "Rare": rarityDesc = "high quality, mystic purple haze, silver and obsidian details, sharp focus, magical runes"; break;
      case "Common": rarityDesc = "standard fantasy art, simple rustic frame, worn texture, basic elemental effects"; break;
    }

    // Simplified prompt to avoid URL length issues
    const imagePrompt = `spell card of ${element} element, ${style} style, representing ${keyword}. ${rarity} quality. fantasy art, high resolution.`;
    console.log("Final Prompt:", imagePrompt);

    // 3. Generate Image (Pollinations.ai)
    // FIX: Use 'image.pollinations.ai' for direct raw image data. 
    // The previous 'pollinations.ai/p/' URL was returning an HTML page.
    const encodedPrompt = encodeURIComponent(imagePrompt);
    const randomSeed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${randomSeed}&model=flux&nologo=true`;

    console.log("Fetching image from:", imageUrl);
    const imageRes = await fetch(imageUrl);

    if (!imageRes.ok) {
      throw new Error(`Pollinations API error: ${imageRes.status} ${imageRes.statusText}`);
    }

    const contentType = imageRes.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
      throw new Error("Pollinations API returned HTML instead of an image. Please try again.");
    }

    const imageBlob = await imageRes.blob();

    // 4. Upload Image to Pinata (Direct API Call)
    console.log("Pinning image to IPFS via Direct API...");

    // Create Base64 for immediate frontend preview (Bypasses URL loading issues)
    const base64Image = `data:image/png;base64,${Buffer.from(await imageBlob.arrayBuffer()).toString('base64')}`;

    const formData = new FormData();
    formData.append("file", imageBlob, `SpellCard-${element}-${Date.now()}.png`);

    const pinataMetadata = JSON.stringify({
      name: `SpellCard-${element}-${Date.now()}`,
      keyvalues: { rarity: rarity }
    });
    formData.append("pinataMetadata", pinataMetadata);

    const pinataOptions = JSON.stringify({
      cidVersion: 0,
    });
    formData.append("pinataOptions", pinataOptions);

    const uploadRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      // Don't fail the whole request if pinning fails, we at least have base64
      console.error(`Pinata Upload Error: ${uploadRes.status} ${errorText}`);
    }

    let imageIpfsUrl = "";
    if (uploadRes.ok) {
      const imageUploadResult = await uploadRes.json();
      imageIpfsUrl = `https://gateway.pinata.cloud/ipfs/${imageUploadResult.IpfsHash}`;
      console.log("Image Pinned:", imageIpfsUrl);
    } else {
      // Fallback for demo if pinata fails
      imageIpfsUrl = imageUrl;
    }

    // 5. Create Metadata
    const metadata = {
      name: `${element} Spell Card`,
      description: `A ${rarity} ${element} spell card in ${style} style. Aspect: ${keyword}.`,
      image: imageIpfsUrl,
      attributes: [
        { trait_type: "Element", value: element },
        { trait_type: "Style", value: style },
        { trait_type: "Keyword", value: keyword },
        { trait_type: "Rarity", value: rarity },
      ],
    };

    let metadataIpfsUrl = "";
    // 6. Upload Metadata to Pinata (Direct API Call)
    if (uploadRes.ok) {
      console.log("Pinning metadata to IPFS via Direct API...");
      const metadataRes = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PINATA_JWT}`,
        },
        body: JSON.stringify({
          pinataContent: metadata,
          pinataMetadata: {
            name: `SpellCard-Metadata-${element}-${Date.now()}`,
          },
          pinataOptions: {
            cidVersion: 0,
          },
        }),
      });

      if (metadataRes.ok) {
        const metadataUploadResult = await metadataRes.json();
        metadataIpfsUrl = `https://gateway.pinata.cloud/ipfs/${metadataUploadResult.IpfsHash}`;
        console.log("Metadata Pinned:", metadataIpfsUrl);
      }
    }

    console.log("Success! Returning response.");

    return NextResponse.json({
      success: true,
      imageUrl: imageIpfsUrl,
      previewUrl: imageUrl,
      base64: base64Image, // <--- THE KEY FIX
      metadataUrl: metadataIpfsUrl,
      metadata,
      rarity,
    });

  } catch (error: any) {
    console.error("Error in generate-spell:", error);
    return NextResponse.json(
      {
        error: "Failed to generate spell",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
