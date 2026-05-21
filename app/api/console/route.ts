import { NextResponse } from "next/server";
import { GoogleGenAI, Type, FunctionCallingConfigMode } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const readProductsTool = {
  name: "readProductsFromDatabase",
  description: "Fetches all active items from the store product inventory registry.",
  parameters: { type: Type.OBJECT, properties: {} },
};

const updatePriceTool = {
  name: "updateProductPriceInDatabase",
  description: "Modifies the price of a specific asset item in the registry using its name or id.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      productId: { type: Type.STRING, description: "The unique ID or description name of the product." },
      newPrice: { type: Type.NUMBER, description: "The new numeric target valuation price." },
    },
    required: ["productId", "newPrice"],
  },
};

const readVenturesTool = {
  name: "readVenturesFromDatabase",
  description: "Fetches active business ventures, side hustles, brand metrics, and checklists.",
  parameters: { type: Type.OBJECT, properties: {} },
};

const toggleTaskTool = {
  name: "toggleVentureTaskCompletion",
  description: "Marks a venture milestone task checklist item as complete or incomplete.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskSearchString: { type: Type.STRING, description: "Key terms matching the task description text." },
      shouldBeComplete: { type: Type.BOOLEAN, description: "True to mark done, false to reopen." }
    },
    required: ["taskSearchString", "shouldBeComplete"],
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
         Select the correct system capability based on operator request:
         - View inventory items/products -> 'readProductsFromDatabase'
         - Change product pricing structure -> 'updateProductPriceInDatabase'
         - View active businesses, side hustles, startups, metrics, or checklists -> 'readVenturesFromDatabase'
         - Check off tasks, change completion statuses, or finish a milestone -> 'toggleVentureTaskCompletion'`,
        `Current Operator Directive: "${prompt}"`
      ],
      config: {
        tools: [{ functionDeclarations: [readProductsTool, updatePriceTool, readVenturesTool, toggleTaskTool] }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.ANY,
            allowedFunctionNames: [
              "readProductsFromDatabase", 
              "updateProductPriceInDatabase", 
              "readVenturesFromDatabase", 
              "toggleVentureTaskCompletion"
            ]
          }
        }
      },
    });

    const functionCalls = response.functionCalls;
    if (!functionCalls || functionCalls.length === 0) {
      return NextResponse.json({ output: "NEXORA-CORE: System processing bypassed execution hooks." });
    }

    const { name, args } = functionCalls[0];

    // 🖥️ PRODUCTS READ
    if (name === "readProductsFromDatabase") {
      const { data: realRecords, error: fetchError } = await supabase
        .from("products")
        .select("id, title, tag, price_zar, stock_count");

      if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

      const readNormalized = (realRecords || []).map((item: any) => ({
        id: item.id,
        name: item.title || "Unnamed Asset",
        category: item.tag || "General",
        price: Number(item.price_zar) || 0,
        stock: Number(item.stock_count) || 0,
      }));

      return NextResponse.json({ toolTriggered: true, action: "READ_PRODUCTS", data: readNormalized });
    }

    // 🖥️ PRODUCT PRICE UPDATE
    if (name === "updateProductPriceInDatabase") {
      const { productId, newPrice } = args as { productId: string; newPrice: number };
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
      
      let query = supabase.from("products").update({ price_zar: newPrice });
      query = isUUID ? query.eq("id", productId) : query.ilike("title", `%${productId}%`);

      const { error: updateError } = await query;
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

      const { data: finalSync } = await supabase.from("products").select("id, title, tag, price_zar, stock_count");
      const updateNormalized = (finalSync || []).map((item: any) => ({
        id: item.id,
        name: item.title || "Unnamed Asset",
        category: item.tag || "General",
        price: Number(item.price_zar) || 0,
        stock: Number(item.stock_count) || 0,
      }));

      return NextResponse.json({
        toolTriggered: true,
        action: "READ_PRODUCTS",
        message: `REGISTRY MUTATION SUCCESSFUL: Synchronized asset parameters across live production clusters.`,
        data: updateNormalized
      });
    }

    // 🖥️ VENTURES READ
    if (name === "readVenturesFromDatabase") {
      const { data: venturesList, error: ventError } = await supabase
        .from("ventures")
        .select(`
          id,
          name,
          focus_sector,
          revenue_zar,
          target_launch_date,
          venture_tasks ( id, task_description, is_completed, priority )
        `);

      if (ventError) return NextResponse.json({ error: ventError.message }, { status: 500 });

      return NextResponse.json({
        toolTriggered: true,
        action: "READ_VENTURES",
        data: venturesList || []
      });
    }

    // 🖥️ TASK TOGGLE
    if (name === "toggleVentureTaskCompletion") {
      const { taskSearchString, shouldBeComplete } = args as { taskSearchString: string; shouldBeComplete: boolean };

      const { error: taskUpdateError } = await supabase
        .from("venture_tasks")
        .update({ is_completed: shouldBeComplete })
        .ilike("task_description", `%${taskSearchString}%`);

      if (taskUpdateError) return NextResponse.json({ error: taskUpdateError.message }, { status: 500 });

      const { data: refreshedVentures } = await supabase
        .from("ventures")
        .select(`
          id,
          name,
          focus_sector,
          revenue_zar,
          target_launch_date,
          venture_tasks ( id, task_description, is_completed, priority )
        `);

      return NextResponse.json({
        toolTriggered: true,
        action: "READ_VENTURES",
        message: `VENTURE OPERATION UPDATED: Task matching status synced successfully.`,
        data: refreshedVentures || []
      });
    }

    return NextResponse.json({ output: "Unhandled tool execution hook mapped." });

  } catch (error: any) {
    return NextResponse.json({ error: `SYSTEM EXCEPTION: ${error.message}` }, { status: 500 });
  }
}