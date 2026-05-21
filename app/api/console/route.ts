import { NextResponse } from "next/server";
import { GoogleGenAI, Type, FunctionCallingConfigMode } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
      productId: { type: Type.STRING, description: "The unique ID, token, or title name of the product." },
      newPrice: { type: Type.NUMBER, description: "The new numeric target valuation price." },
    },
    required: ["productId", "newPrice"],
  },
};

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    if (!prompt) return NextResponse.json({ error: "Missing operator directive." }, { status: 400 });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        `You are NEXORA-CORE, an elite tactical mainframe OS console.
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

    const { name, args } = functionCalls[0];

    // 🖥️ READ JUNCTION
    if (name === "readProductsFromDatabase") {
      const { data: realRecords, error: fetchError } = await supabase
        .from("products")
        .select("id, title, tag, price_zar, stock_count");

      if (fetchError) {
        console.error("Database read error:", fetchError);
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
      }

      const readNormalized = (realRecords || []).map((item: any) => ({
        id: item.id,
        name: item.title || "Unnamed Asset",
        category: item.tag || "General",
        price: Number(item.price_zar) || 0,
        stock: Number(item.stock_count) || 0,
      }));

      return NextResponse.json({
        toolTriggered: true,
        action: "READ",
        data: readNormalized
      });
    }

    // 🖥️ WRITE JUNCTION
    if (name === "updateProductPriceInDatabase") {
      const { productId, newPrice } = args as { productId: string; newPrice: number };
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
      
      // Target price_zar directly
      let query = supabase.from("products").update({ price_zar: newPrice });

      if (isUUID) {
        query = query.eq("id", productId);
      } else {
        query = query.ilike("title", `%${productId}%`);
      }

      const { error: updateError } = await query;
      if (updateError) {
        return NextResponse.json({ error: `Update failed: ${updateError.message}` }, { status: 500 });
      }

      // Fetch fresh synced records for the terminal UI layout
      const { data: finalSync } = await supabase
        .from("products")
        .select("id, title, tag, price_zar, stock_count");

      const updateNormalized = (finalSync || []).map((item: any) => ({
        id: item.id,
        name: item.title || "Unnamed Asset",
        category: item.tag || "General",
        price: Number(item.price_zar) || 0,
        stock: Number(item.stock_count) || 0,
      }));

      return NextResponse.json({
        toolTriggered: true,
        action: "UPDATE",
        message: `REGISTRY MUTATION SUCCESSFUL: Synchronized asset parameters across live production clusters.`,
        data: updateNormalized
      });
    }

    return NextResponse.json({ output: "Unhandled tool execution hook mapped." });

  } catch (error: any) {
    console.error("CRITICAL GRID FAILURE:", error);
    return NextResponse.json({ error: `SYSTEM EXCEPTION: ${error.message}` }, { status: 500 });
  }
}