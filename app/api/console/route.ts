import { NextResponse } from "next/server";
import { GoogleGenAI, Type, FunctionCallingConfigMode } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const readProductsTool = {
  name: "readProductsFromDatabase",
  description: "Fetches all active items from the store database registry.",
  parameters: { type: Type.OBJECT, properties: {} },
};

const updatePriceTool = {
  name: "updateProductPriceInDatabase",
  description: "Modifies the price of a specific asset item in the registry.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      productId: { type: Type.STRING, description: "The UUID or ID string of the product." },
      newPrice: { type: Type.NUMBER, description: "The new numeric price." },
    },
    required: ["productId", "newPrice"],
  },
};

// Mock Database Registry — Swap this out with your Supabase client selections later!
let mockDatabase = [
  { id: "P-101", name: "Avenor Core Matrix", category: "Core Tech", price: 4999, stock: 12 },
  { id: "P-102", name: "Pulse Vitality Serum", category: "Wellness", price: 89, stock: 145 },
  { id: "P-103", name: "Lostnover Oversized Hoodie", category: "Apparel", price: 120, stock: 42 },
];

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    if (!prompt) return NextResponse.json({ error: "Missing operator directive." }, { status: 400 });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        `You are NEXORA-CORE, an elite tactical mainframe OS console with absolute clearance.
         - View inventory/manifest demands -> execute 'readProductsFromDatabase'
         - Financial adjustments/pricing modifications -> execute 'updateProductPriceInDatabase'`,
        `Current Operator Directive: "${prompt}"`
      ],
      config: {
        tools: [{ functionDeclarations: [readProductsTool, updatePriceTool] }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.ANY,
            allowedFunctionNames: ["readProductsFromDatabase", "updateProductPriceInDatabase"]
          }
        }
      },
    });

    const functionCalls = response.functionCalls;
    if (!functionCalls || functionCalls.length === 0) {
      return NextResponse.json({ output: "NEXORA-CORE: System processing bypassed execution hooks." });
    }

    const toolCall = functionCalls[0];
    const { name, args } = toolCall;

    // 🖥️ DATABASE ROUTING JUNCTION
    if (name === "readProductsFromDatabase") {
      return NextResponse.json({
        toolTriggered: true,
        action: "READ",
        data: mockDatabase
      });
    }

    if (name === "updateProductPriceInDatabase") {
      const { productId, newPrice } = args as { productId: string; newPrice: number };
      let updated = false;

      mockDatabase = mockDatabase.map((prod) => {
        if (prod.id === productId || prod.name.toLowerCase().includes(productId.toLowerCase())) {
          prod.price = newPrice;
          updated = true;
          return prod;
        }
        return prod;
      });

      if (!updated) {
        return NextResponse.json({ error: `Asset target [${productId}] not found in database tables.` }, { status: 404 });
      }

      return NextResponse.json({
        toolTriggered: true,
        action: "UPDATE",
        message: `REGISTRY MUTATION SUCCESSFUL: Asset ${productId} re-indexed to $${newPrice}.`,
        data: mockDatabase
      });
    }

    return NextResponse.json({ output: "Unhandled tool execution hook mapped." });

  } catch (error: any) {
    console.error("CRITICAL GRID FAILURE:", error);
    return NextResponse.json({ error: `SYSTEM EXCEPTION: ${error.message}` }, { status: 500 });
  }
}