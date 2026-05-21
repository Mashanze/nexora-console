import { NextResponse } from "next/server";
import { GoogleGenAI, Type, FunctionCallingConfigMode } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Using service_role key server-side to safely bypass RLS boundaries elegantly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- MODULE 1 TOOLS ---
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

// --- MODULE 2 TOOLS ---
const readVenturesTool = {
  name: "readVenturesFromDatabase",
  description: "Fetches active business ventures, their financial metrics, and operational launch task checklists.",
  parameters: { type: Type.OBJECT, properties: {} },
};

const toggleTaskTool = {
  name: "toggleVentureTaskCompletion",
  description: "Marks a venture milestone task checklist item as complete or incomplete based on its descriptive title.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskSearchString: { type: Type.STRING, description: "Key terms matching the task description text to cross off." },
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
         Analyze the operator's prompt and select the absolute correct tool:
         
         1. 'readProductsFromDatabase': Use ONLY if they explicitly want to view store products, inventory items, stock counts, or asset pricing.
         2. 'updateProductPriceInDatabase': Use ONLY when they explicitly want to alter, modify, or change a product's price.
         
         3. 'readVenturesFromDatabase': Use ONLY if they mention "ventures", "brands", "companies", "side hustles", "startups", "metrics", "checklists", or "tasks".
         4. 'toggleVentureTaskCompletion': Use ONLY if they tell you to complete, check off, mark done, or finish a milestone task/checklist item.`,
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
      return NextResponse.json({ output: "NEXORA-CORE: Intelligence cluster bypassed execution hooks." });
    }

    const { name, args } = functionCalls[0];

    // ==========================================
    // 🖥️ MODULE 1 JUNCTIONS
    // ==========================================
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

    // ==========================================
    // 🖥️ MODULE 2 JUNCTIONS (NEW VENTURE METRICS)
    // ==========================================
    if (name === "readVenturesFromDatabase") {
      // Fetch ventures alongside their nested checklists relationally
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

    if (name === "toggleVentureTaskCompletion") {
      const { taskSearchString, shouldBeComplete } = args as { taskSearchString: string; shouldBeComplete: boolean };

      // Update task record matching string text parameters
      const { error: taskUpdateError } = await supabase
        .from("venture_tasks")
        .update({ is_completed: shouldBeComplete })
        .ilike("task_description", `%${taskSearchString}%`);

      if (taskUpdateError) return NextResponse.json({ error: taskUpdateError.message }, { status: 500 });

      // Pull down updated database tree structure to refresh UI panels instantly
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