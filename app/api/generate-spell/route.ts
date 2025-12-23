import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import pinataSDK from "@pinata/sdk";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

const pinata = process.env.PINATA_JWT
  ? new pinataSDK({ pinataJWT: process.env.PINATA_JWT })
  : null;

interface GenerateSpellRequest {
  element: string;
  style: string;
  keyword: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateSpellRequest = await request.json();
    const { element, style, keyword } = body;

    if (!element || !style || !keyword) {
      return NextResponse.json(
        { error: "Missing required fields: element, style, keyword" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    if (!pinata) {
      return NextResponse.json(
        { error: "Pinata JWT not configured" },
        { status: 500 }
      );
    }

    // Generate image using DALL-E 3
    const imagePrompt = `A mystical trading card design of a magic spell. Element: ${element}. Art Style: ${style}, chaotic and destruction vibes. Core emotion: ${keyword}. High detail, fantasy art, glowing effects, borders included.`;

    console.log("Generating image with prompt:", imagePrompt);

    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    });

    const imageUrl = imageResponse.data[0].url;
    if (!imageUrl) {
      throw new Error("Failed to generate image");
    }

    // Download the image
    const imageRes = await fetch(imageUrl);
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

    // Upload image to IPFS using Pinata
    // Pinata SDK expects a readable stream or Buffer in Node.js
    const imageUploadOptions = {
      pinataMetadata: {
        name: `SpellCard-${element}-${Date.now()}`,
      },
      pinataOptions: {
        cidVersion: 0,
      },
    };

    // Use pinFileToIPFS for file uploads
    const imageUploadResult = await pinata.pinFileToIPFS(
      imageBuffer,
      imageUploadOptions
    );
    const imageIpfsHash = imageUploadResult.IpfsHash;
    const imageIpfsUrl = `https://gateway.pinata.cloud/ipfs/${imageIpfsHash}`;

    // Create metadata JSON
    const metadata = {
      name: `${element} Spell Card`,
      description: `A mystical spell card with ${element} element, ${style} style, embodying ${keyword}.`,
      image: imageIpfsUrl,
      attributes: [
        {
          trait_type: "Element",
          value: element,
        },
        {
          trait_type: "Style",
          value: style,
        },
        {
          trait_type: "Keyword",
          value: keyword,
        },
        {
          trait_type: "Rarity",
          value: "TBD", // Will be set on-chain during minting
        },
      ],
    };

    // Upload metadata to IPFS using pinJSONToIPFS
    const metadataUploadOptions = {
      pinataMetadata: {
        name: `SpellCard-Metadata-${element}-${Date.now()}`,
      },
      pinataOptions: {
        cidVersion: 0,
      },
    };

    const metadataUploadResult = await pinata.pinJSONToIPFS(
      metadata,
      metadataUploadOptions
    );
    const metadataIpfsHash = metadataUploadResult.IpfsHash;
    const metadataIpfsUrl = `https://gateway.pinata.cloud/ipfs/${metadataIpfsHash}`;

    return NextResponse.json({
      success: true,
      imageUrl: imageIpfsUrl,
      metadataUrl: metadataIpfsUrl,
      metadata,
    });
  } catch (error) {
    console.error("Error generating spell:", error);
    return NextResponse.json(
      {
        error: "Failed to generate spell",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

