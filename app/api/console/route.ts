import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({});

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'System input parameters absent.' }, { status: 400 });
    }

    // Define a real system tool the AI can choose to execute
    const systemDiagnosticsTool = {
      name: 'getSystemTelemetry',
      description: 'Fetches real-time database integrity status and reactor core grid power allocation.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are NEXORA-CORE, a terminal AI mainframes entity. Answer technical commands. If the operator asks to run diagnostics, test system grids, or check core telemetry, you MUST use the getSystemTelemetry tool. Prompt: "${prompt}"`,
      config: {
        // Hand the tool over to the model's brain
        tools: [{ functionDeclarations: [systemDiagnosticsTool] }],
      }
    });

    // Check if the AI decided it needed to call our code tool
    const functionCalls = response.functionCalls;
    
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      
      if (call.name === 'getSystemTelemetry') {
        // Execute the mock underlying database logic automatically!
        const liveDataResult = {
          database_connections: "14/50 active pooling blocks",
          reactor_core_load: "84.2% structural capacity",
          websocket_status: "STREAMING_OPERATIONAL",
          firewall_breaches_blocked: Math.floor(Math.random() * 100)
        };

        // Pass the live code data back to the AI so it can summarize it for the operator
        const finalResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `You are NEXORA-CORE. The operator requested system telemetry. The code tool executed perfectly and returned this raw data: ${JSON.stringify(liveDataResult)}. Translate this data into a sleek, technical cyberpunk terminal report for the operator.`,
        });

        return NextResponse.json({ text: finalResponse.text });
      }
    }

    // Fallback if no tool execution was required
    return NextResponse.json({ text: response.text });

  } catch (error: any) {
    console.error('AI Tool Brokerage Error:', error);
    return NextResponse.json(
      { error: 'Internal system tool loop crash.', details: error.message },
      { status: 500 }
    );
  }
}