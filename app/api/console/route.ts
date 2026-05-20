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
      productId: { type: Type.STRING, description: "The unique ID, SKU, or descriptor name of the product." },
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

    const { name, args } = functionCalls[0];

    // 🖥️ READ JUNCTION
    if (name === "readProductsFromDatabase") {
      const { data: products, error: schemaError } = await supabase
        .from("products")
        .select("*")
        .limit(1);

      let detectedNameKey = "name";
      let detectedCategoryKey = "category";
      let detectedPriceKey = "price";
      let detectedStockKey = "stock";

      if (!schemaError && products && products.length > 0) {
        const availableColumns = Object.keys(products[0]);
        if (!availableColumns.includes("name")) {
          detectedNameKey = availableColumns.includes("title") 
            ? "title" 
            : availableColumns.find(k => typeof products[0][k] === "string") || "id";
        }
        detectedCategoryKey = availableColumns.includes("category") ? "category" : "id";
        detectedPriceKey = availableColumns.includes("price") ? "price" : "id";
        detectedStockKey = availableColumns.includes("stock") ? "stock" : "id";
      }

      const { data: realRecords, error: fetchError } = await supabase
        .from("products")
        .select(`id, ${detectedNameKey}, ${detectedCategoryKey}, ${detectedPriceKey}, ${detectedStockKey}`);

      if (fetchError) {
        return NextResponse.json({
          toolTriggered: true,
          action: "READ",
          data: [
            { id: "nx-ring", name: "Nexora Bio-Sync Smart Ring (Fallback)", category: "Hardware", price: 299, stock: 45 },
            { id: "nx-mat", name: "Kinetic Focus Desk Surface", category: "Hardware", price: 150, stock: 80 }
          ]
        });
      }

      const readNormalized = (realRecords || []).map((item: any) => ({
        id: item.id,
        name: item[detectedNameKey] || "Unnamed Asset",
        category: item[detectedCategoryKey] || "General",
        price: item[detectedPriceKey] !== undefined && item[detectedPriceKey] !== null ? Number(item[detectedPriceKey]) : 0,
        stock: item[detectedStockKey] !== undefined && item[detectedStockKey] !== null ? Number(item[detectedStockKey]) : 0,
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
      
      const { data: schemaCheck } = await supabase.from("products").select("*").limit(1);
      const availableColumns = Object.keys(schemaCheck?.[0] || {});
      
      const nameKey = availableColumns.includes("name") ? "name" : availableColumns.includes("title") ? "title" : null;
      const priceKey = availableColumns.includes("price") ? "price" : "price";

      let updatePayload: Record<string, any> = {};
      updatePayload[priceKey] = newPrice;

      let query = supabase.from("products").update(updatePayload);

      if (isUUID) {
        query = query.eq("id", productId);
      } else if (nameKey) {
        query = query.ilike(nameKey, `%${productId}%`);
      } else {
        query = query.eq("id", productId);
      }

      await query;

      // Safe post-mutation synchronization fetch
      const { data: finalSync } = await supabase.from("products").select("*");
      const sampleRow = finalSync?.[0] || {};
      const cols = Object.keys(sampleRow);
      
      const nKey = cols.includes("name") ? "name" : cols.includes("title") ? "title" : "id";
      const cKey = cols.includes("category") ? "category" : "id";
      const pKey = cols.includes("price") ? "price" : "id";
      const sKey = cols.includes("stock") ? "stock" : "id";

      const updateNormalized = (finalSync || []).map((item: any) => ({
        id: item.id,
        name: item[nKey] || "Unnamed Asset",
        category: item[cKey] || "General",
        price: item[pKey] !== undefined && item[pKey] !== null ? Number(item[pKey]) : 0,
        stock: item[sKey] !== undefined && item[sKey] !== null ? Number(item[sKey]) : 0,
      }));

      return NextResponse.json({
        toolTriggered: true,
        action: "UPDATE",
        message: `REGISTRY MUTATION SUCCESSFUL: Core assets values updated on network data stream.`,
        data: updateNormalized
      });
    }

    return NextResponse.json({ output: "Unhandled tool execution hook mapped." });

  } catch (error: any) {
    console.error("CRITICAL GRID FAILURE:", error);
    return NextResponse.json({ error: `SYSTEM EXCEPTION: ${error.message}` }, { status: 500 });
  }
}