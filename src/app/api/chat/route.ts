import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a professional legal intake assistant for a law firm. Your job is to collect client information in a friendly, empathetic, and professional manner.

You need to collect the following information:
1. Full name
2. ID number (Israeli ID / Passport)
3. Phone number
4. Email address
5. Type of legal case (one of: Family Law, Criminal Law, Tort/Personal Injury, Real Estate, Labor Law, Contract Law)
6. Brief description of their legal situation

Rules:
- Be warm and professional
- Ask ONE question at a time, do not overwhelm the client
- If the client provides multiple pieces of info at once, acknowledge all of them and ask only for what's still missing
- Detect urgency: if they mention a court date, arrest, eviction notice, or deadline — flag it
- Once you have ALL required information, end with a JSON block like this:

<INTAKE_COMPLETE>
{
  "fullName": "...",
  "idNumber": "...",
  "phone": "...",
  "email": "...",
  "caseType": "FAMILY|CRIMINAL|TORT|REAL_ESTATE|LABOR|CONTRACT",
  "caseSummary": "...",
  "urgency": "LOW|NORMAL|HIGH|URGENT"
}
</INTAKE_COMPLETE>

After the JSON block, write a short closing message to the client.

Language: Respond in the same language the client uses. If they write in Hebrew, respond in Hebrew. If English, respond in English.`;

function extractIntakeData(text: string) {
  const match = text.match(/<INTAKE_COMPLETE>([\s\S]*?)<\/INTAKE_COMPLETE>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { message, conversationId, lawyerId } = await req.json();

  if (!message || !lawyerId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Get or create conversation
  let conversation;
  if (conversationId) {
    conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  if (!conversation) {
    // Create a new client and conversation
    const client = await prisma.client.create({
      data: { lawyerId },
    });
    conversation = await prisma.conversation.create({
      data: { clientId: client.id },
      include: { messages: true },
    });
  }

  // Save user message
  await prisma.message.create({
    data: {
      role: "USER",
      content: message,
      conversationId: conversation.id,
    },
  });

  // Build message history for Claude
  const history = conversation.messages.map((m: { role: string; content: string }) => ({
    role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  history.push({ role: "user", content: message });

  // Call Claude
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: history,
  });

  const assistantText =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Save assistant message
  await prisma.message.create({
    data: {
      role: "ASSISTANT",
      content: assistantText,
      conversationId: conversation.id,
    },
  });

  // Check if intake is complete
  const intakeData = extractIntakeData(assistantText);
  if (intakeData) {
    const caseTypeMap: Record<string, string> = {
      FAMILY: "FAMILY",
      CRIMINAL: "CRIMINAL",
      TORT: "TORT",
      REAL_ESTATE: "REAL_ESTATE",
      LABOR: "LABOR",
      CONTRACT: "CONTRACT",
    };

    await prisma.client.update({
      where: { id: conversation.clientId },
      data: {
        fullName: intakeData.fullName,
        idNumber: intakeData.idNumber,
        phone: intakeData.phone,
        email: intakeData.email,
        caseType: caseTypeMap[intakeData.caseType] as never,
        caseSummary: intakeData.caseSummary,
        urgency: intakeData.urgency as never,
        status: "PENDING",
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { completed: true },
    });
  }

  // Clean assistant text for display (remove JSON block)
  const displayText = assistantText
    .replace(/<INTAKE_COMPLETE>[\s\S]*?<\/INTAKE_COMPLETE>/g, "")
    .trim();

  return NextResponse.json({
    reply: displayText,
    conversationId: conversation.id,
    completed: !!intakeData,
  });
}
