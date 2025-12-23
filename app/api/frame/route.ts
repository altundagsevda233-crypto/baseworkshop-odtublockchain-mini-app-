import { NextRequest, NextResponse } from "next/server";

const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://baseworkshop-odtublockchain-mini-ap.vercel.app");

const ELEMENTS = [
  "Fire",
  "Water",
  "Earth",
  "Air",
  "Lightning",
  "Ice",
  "Shadow",
  "Light",
  "Nature",
  "Metal",
  "Poison",
  "Psychic",
  "Chaos",
  "Order",
  "Void",
  "Time",
  "Space",
  "Gravity",
  "Sound",
  "Mind",
];

const STYLES = ["Chaos", "Order", "Nature", "Dark"];

type FrameState =
  | "element_selection"
  | "style_selection"
  | "keyword_input"
  | "generating"
  | "preview"
  | "minting";

interface FrameData {
  state: FrameState;
  element?: string;
  style?: string;
  keyword?: string;
  metadataUrl?: string;
  imageUrl?: string;
}

function parseFrameData(buttonValue?: string): FrameData {
  if (!buttonValue) {
    return { state: "element_selection" };
  }

  try {
    const data = JSON.parse(buttonValue) as FrameData;
    return data;
  } catch {
    // If parsing fails, check if it's a simple element selection
    if (ELEMENTS.includes(buttonValue)) {
      return { state: "element_selection", element: buttonValue };
    }
    return { state: "element_selection" };
  }
}

function generateElementButtons(currentData: FrameData, page: number = 0) {
  const elementsPerPage = 4;
  const startIndex = page * elementsPerPage;
  const endIndex = Math.min(startIndex + elementsPerPage, ELEMENTS.length);
  const pageElements = ELEMENTS.slice(startIndex, endIndex);

  const buttons = pageElements.map((element) => ({
    label: element,
    action: {
      type: "post",
    },
    value: JSON.stringify({
      ...currentData,
      state: "element_selection",
      element,
      page,
    }),
  }));

  // Add navigation buttons if needed (max 4 buttons total in Frame)
  // We'll show 3 elements + 1 nav button, or 4 elements if no nav needed
  if (page > 0 && buttons.length < 4) {
    buttons.unshift({
      label: "← Prev",
      action: { type: "post" },
      value: JSON.stringify({
        ...currentData,
        state: "element_selection",
        page: page - 1,
      }),
    });
  }

  if (endIndex < ELEMENTS.length && buttons.length < 4) {
    buttons.push({
      label: "Next →",
      action: { type: "post" },
      value: JSON.stringify({
        ...currentData,
        state: "element_selection",
        page: page + 1,
      }),
    });
  }

  return buttons;
}

function generateFrameResponse(
  state: FrameState,
  data: FrameData,
  imageUrl?: string,
  postUrl?: string
): NextResponse {
  // Encode state in URL for persistence
  const stateParam = encodeURIComponent(JSON.stringify(data));
  const framePostUrl = postUrl || `${ROOT_URL}/api/frame?state=${stateParam}`;
  let image = `${ROOT_URL}/hero.png`; // Default image
  let buttons: string[] = [];
  let buttonActions: string[] = [];
  let buttonTargets: string[] = [];
  let textInput: string | undefined;

  switch (state) {
    case "element_selection":
      image = `${ROOT_URL}/hero.png`;
      const page = (data as any).page || 0;
      const elementButtons = generateElementButtons(data, page);
      buttons = elementButtons.map((b) => b.label);
      buttonActions = elementButtons.map((b) => b.action.type);
      buttonTargets = elementButtons.map((b) => b.value || "");
      break;

    case "style_selection":
      image = `${ROOT_URL}/hero.png`;
      const styleButtons = STYLES.map((style) => ({
        label: style,
        value: JSON.stringify({
          ...data,
          state: "style_selection",
          style,
        }),
      }));
      buttons = styleButtons.map((b) => b.label);
      buttonActions = styleButtons.map(() => "post");
      buttonTargets = styleButtons.map((b) => b.value);
      break;

    case "keyword_input":
      image = `${ROOT_URL}/hero.png`;
      textInput = "Enter keyword (e.g., Rage)";
      buttons = ["Generate Spell"];
      buttonActions = ["post"];
      buttonTargets = [
        JSON.stringify({
          ...data,
          state: "generating",
        }),
      ];
      break;

    case "generating":
      image = `${ROOT_URL}/hero.png`; // Loading image
      buttons = ["⏳ Generating..."];
      buttonActions = ["post"];
      buttonTargets = [JSON.stringify(data)];
      break;

    case "preview":
      image = data.imageUrl || `${ROOT_URL}/hero.png`;
      buttons = ["Mint NFT (0.001 ETH)"];
      buttonActions = ["tx"];
      // Pass the metadataUrl to the mint endpoint
      const mintUrl = `${ROOT_URL}/api/mint?tokenURI=${encodeURIComponent(data.metadataUrl || "")}`;
      buttonTargets = [mintUrl];
      break;

    default:
      image = `${ROOT_URL}/hero.png`;
      buttons = ["Start Creating"];
      buttonActions = ["post"];
      buttonTargets = [JSON.stringify({ state: "element_selection" })];
  }

  // Build HTML with Farcaster Frame v2 meta tags
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${image}" />
  <meta property="og:image" content="${image}" />
  <meta property="fc:frame:post_url" content="${framePostUrl}" />
`;

  if (textInput) {
    html += `  <meta property="fc:frame:input:text" content="${textInput}" />\n`;
  }

  buttons.forEach((button, index) => {
    const action = buttonActions[index] || "post";
    html += `  <meta property="fc:frame:button:${index + 1}" content="${button}" />\n`;
    html += `  <meta property="fc:frame:button:${index + 1}:action" content="${action}" />\n`;
    if (action === "tx" && buttonTargets[index]) {
      html += `  <meta property="fc:frame:button:${index + 1}:target" content="${buttonTargets[index]}" />\n`;
    }
    // For post actions, we'll handle the data in the POST handler via button value
  });

  html += `  <title>SpellCard NFT Creator</title>
</head>
<body>
  <h1>SpellCard NFT Creator</h1>
  <img src="${image}" alt="Spell Card" style="max-width: 100%; height: auto;" />
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const stateParam = url.searchParams.get("state");
  
  let frameData: FrameData = { state: "element_selection" };
  
  if (stateParam) {
    try {
      frameData = JSON.parse(decodeURIComponent(stateParam));
    } catch {
      frameData = { state: "element_selection" };
    }
  }
  
  return generateFrameResponse(frameData.state, frameData);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle Farcaster Frame POST request
    const buttonIndex = body.untrustedData?.buttonIndex;
    const textInput = body.untrustedData?.inputText;
    
    // Get state from URL parameter
    const url = new URL(request.url);
    const stateParam = url.searchParams.get("state");
    
    let frameData: FrameData = { state: "element_selection" };
    
    if (stateParam) {
      try {
        frameData = JSON.parse(decodeURIComponent(stateParam));
      } catch {
        frameData = { state: "element_selection" };
      }
    }
    
    // Handle element selection by button index
    if (buttonIndex && frameData.state === "element_selection") {
      const page = (frameData as any).page || 0;
      const elementsPerPage = 4;
      const startIndex = page * elementsPerPage;
      const elementButtons = generateElementButtons(frameData, page);
      
      // Check if it's a navigation button
      if (buttonIndex === 1 && page > 0 && elementButtons[0]?.label === "← Prev") {
        (frameData as any).page = page - 1;
        frameData.state = "element_selection";
      } else if (buttonIndex === elementButtons.length && elementButtons[elementButtons.length - 1]?.label === "Next →") {
        (frameData as any).page = page + 1;
        frameData.state = "element_selection";
      } else {
        // It's an element selection
        const adjustedIndex = page > 0 && elementButtons[0]?.label === "← Prev" ? buttonIndex - 1 : buttonIndex;
        const elementIndex = startIndex + adjustedIndex - 1;
        
        if (elementIndex >= 0 && elementIndex < ELEMENTS.length) {
          frameData.element = ELEMENTS[elementIndex];
          frameData.state = "style_selection";
        }
      }
    }
    
    // Handle style selection by button index
    if (buttonIndex && frameData.state === "style_selection" && buttonIndex <= STYLES.length) {
      frameData.style = STYLES[buttonIndex - 1];
      frameData.state = "keyword_input";
    }
    
    // Handle generate button
    if (buttonIndex === 1 && frameData.state === "keyword_input") {
      frameData.state = "generating";
    }

    // Handle text input for keyword
    if (textInput && frameData.state === "keyword_input") {
      frameData.keyword = textInput;
      frameData.state = "generating";
    }

    // Handle text input for keyword (when user submits with Generate button)
    if (textInput && (frameData.state === "keyword_input" || frameData.state === "generating")) {
      frameData.keyword = textInput;
      if (frameData.state === "keyword_input") {
        frameData.state = "generating";
      }
    }

    // Handle state transitions
    switch (frameData.state) {
      case "element_selection":
        if (frameData.element) {
          frameData.state = "style_selection";
        }
        break;

      case "style_selection":
        if (frameData.style) {
          frameData.state = "keyword_input";
        }
        break;

      case "generating":
        // Call the generate-spell API
        if (frameData.element && frameData.style && frameData.keyword) {
          try {
            const generateResponse = await fetch(`${ROOT_URL}/api/generate-spell`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                element: frameData.element,
                style: frameData.style,
                keyword: frameData.keyword,
              }),
            });

            if (generateResponse.ok) {
              const result = await generateResponse.json();
              frameData.metadataUrl = result.metadataUrl;
              frameData.imageUrl = result.imageUrl;
              frameData.state = "preview";
            } else {
              throw new Error("Failed to generate spell");
            }
          } catch (error) {
            console.error("Error generating spell:", error);
            const errorState: FrameData = { state: "element_selection" };
            const errorStateParam = encodeURIComponent(JSON.stringify(errorState));
            return generateFrameResponse(
              "element_selection",
              errorState,
              undefined,
              `${ROOT_URL}/api/frame?state=${errorStateParam}`
            );
          }
        }
        break;
    }

    // Generate new state param for next frame
    const nextStateParam = encodeURIComponent(JSON.stringify(frameData));
    const nextPostUrl = `${ROOT_URL}/api/frame?state=${nextStateParam}`;
    
    return generateFrameResponse(
      frameData.state,
      frameData,
      frameData.imageUrl,
      nextPostUrl
    );
  } catch (error) {
    console.error("Frame error:", error);
    const errorState: FrameData = { state: "element_selection" };
    const errorStateParam = encodeURIComponent(JSON.stringify(errorState));
    return generateFrameResponse(
      "element_selection",
      errorState,
      undefined,
      `${ROOT_URL}/api/frame?state=${errorStateParam}`
    );
  }
}

