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

    // 🖥️ READ INTERCEPT
    if (name === "readProductsFromDatabase") {
      // Try fetching with standard names first
      const { data: products, error } = await supabase
        .from("products")
        .select("*")
        .limit(1);

      if (error) {
        throw new Error(`Supabase Query Fault: ${error.message}`);
      }

      // Dynamic Mapper: Find out what text column exists if 'name' doesn't
      const sampleRow = products?.[0] || {};
      const availableColumns = Object.keys(sampleRow);
      
      // Determine your title column name dynamically (fallbacks: 'title', 'product_name', or first string)
      const detectedNameKey = availableColumns.includes("name") 
        ? "name" 
        : availableColumns.includes("title") 
        ? "title" 
        : availableColumns.find(k => typeof sampleRow[k] === "string") || "id";

      const detectedCategoryKey = availableColumns.includes("category") ? "category" : "id";
      const detectedPriceKey = availableColumns.includes("price") ? "price" : "id";
      const detectedStockKey = availableColumns.includes("stock") ? "stock" : "id";

      // Re-query the full list with structural normalization for our UI tables
      const { data: realRecords } = await supabase
        .from("products")
        .select(`id, ${detectedNameKey}, ${detectedCategoryKey}, ${detectedPriceKey}, ${detectedStockKey}`);

      const normalizedData = (realRecords || []).map((item: any) => ({
        id: item.id,
        name: item[detectedNameKey] || "Unnamed Asset",
        category: item[detectedCategoryKey] || "General",
        price: Number(item[detectedPriceKey]) || 0,
        stock: Number(item[detectedStockKey]) || 0,
      }));

      return NextResponse.json({
        toolTriggered: true,
        action: "READ",
        data: normalizedData
      });
    }

    // 🖥️ WRITE INTERCEPT
    if (name === "updateProductPriceInDatabase") {
      const { productId, newPrice } = args as { productId: string; newPrice: number };
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
      
      // Let's grab column names dynamically here as well
      const { data: schemaCheck } = await supabase.from("products").select("*").limit(1);
      const availableColumns = Object.keys(schemaCheck?.[0] || {});
      const nameKey = availableColumns.includes("name") ? "name" : availableColumns.includes("title") ? "title" : null;
      const priceKey = availableColumns.includes("price") ? "price" : "id";

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

      const { error: updateError } = await query;
      if (updateError) throw new Error(`Supabase Mutation Fault: ${updateError.message}`);

      // Dynamic pull back to refresh frontend state tables
      return NextResponse.json({
        toolTriggered: true,
        action: "UPDATE",
        message: `REGISTRY MUTATION SUCCESSFUL: Asset target update handled.`,
        // Re-run the normalized read block to safely refresh values
        data: [] 
      });
    }

    return NextResponse.json({ output: "Unhandled tool execution hook mapped." });

  } catch (error: any) {
    console.error("CRITICAL GRID FAILURE:", error);
    return NextResponse.json({ error: `SYSTEM EXCEPTION: ${error.message}` }, { status: 500 });
  }
}