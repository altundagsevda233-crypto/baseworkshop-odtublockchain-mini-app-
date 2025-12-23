import { NextRequest, NextResponse } from "next/server";
import { parseEther, encodeFunctionData, Abi } from "viem";
import { baseSepolia } from "viem/chains";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

const MINT_ABI: Abi = [
  {
    inputs: [
      {
        internalType: "string",
        name: "tokenURI",
        type: "string",
      },
    ],
    name: "mintSpell",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get tokenURI from query params or body
    const url = new URL(request.url);
    const tokenURI = url.searchParams.get("tokenURI") || body.tokenURI;

    if (!tokenURI) {
      return NextResponse.json(
        { error: "Missing tokenURI" },
        { status: 400 }
      );
    }

    if (!CONTRACT_ADDRESS) {
      return NextResponse.json(
        { error: "Contract address not configured" },
        { status: 500 }
      );
    }

    // Encode the function call
    const data = encodeFunctionData({
      abi: MINT_ABI,
      functionName: "mintSpell",
      args: [tokenURI],
    });

    // Return transaction data for Farcaster Frame
    // Farcaster Frames expect a specific format
    const txData = {
      chainId: `eip155:${baseSepolia.id}`,
      method: "eth_sendTransaction",
      params: {
        to: CONTRACT_ADDRESS,
        data: data,
        value: parseEther("0.001").toString(),
      },
    };

    return NextResponse.json(txData);
  } catch (error) {
    console.error("Mint error:", error);
    return NextResponse.json(
      {
        error: "Failed to create mint transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

