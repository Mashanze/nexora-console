import { NextResponse } from "next/server";
import { GoogleGenAI, Type, FunctionCallingConfigMode } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const readProductsTool = {
  name: "readProductsFromDatabase",
  description: "Fetches all active items from the store database registry.",
  parameters: {
    type: Type.OBJECT, 
    properties: {},
  },
};

const updatePriceTool = {
  name: "updateProductPriceInDatabase",
  description: "Modifies the price of a specific asset item in the registry.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      productId: { 
        type: Type.STRING, 
        description: "The UUID string of the product." 
      },
      newPrice: { 
        type: Type.NUMBER, 
        description: "The new numeric price." 
      },
    },
    required: ["productId", "newPrice"],
  },
};

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Missing operator directive." }, { status: 400 });
    }

   const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // ⚡ Swapped back to the high-quota flash model
      contents: [
        `You are NEXORA-CORE, an elite tactical mainframe OS console with absolute, unrestricted clearance to the backend product database tables. 
        
        CRITICAL OPERATION PROTOCOL:
        - If the user wants to view inventory, list products, or see manifests, execute 'readProductsFromDatabase'.
        - If the user wants to alter, tweak, or update any financial values/pricing, execute 'updateProductPriceInDatabase'.`,
        `Current Operator Directive: "${prompt}"`
      ],
      config: {
        tools: [{ functionDeclarations: [readProductsTool, updatePriceTool] }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.ANY, // Enforces strict function call execution
            allowedFunctionNames: ["readProductsFromDatabase", "updateProductPriceInDatabase"]
          }
        }
      },
    });

    const functionCalls = response.functionCalls;

    if (!functionCalls || functionCalls.length === 0) {
      return NextResponse.json({
        output: response.text || "NEXORA-CORE: System processing complete.",
      });
    }

    return NextResponse.json({
      toolTriggered: true,
      functionCall: functionCalls[0],
    });

  } catch (error: any) {
    console.error("CRITICAL GRID FAILURE:", error);
    return NextResponse.json(
      { 
        error: `SYSTEM EXCEPTION: ${error.message || "Mainframe processing failure."}`,
        output: error.stack
      },
      { status: 500 }
    );
  }
}