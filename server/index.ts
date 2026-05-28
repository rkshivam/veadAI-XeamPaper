import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { Queue, Worker, QueueEvents, Job } from "bullmq";
import IORedis from "ioredis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const PORT = Number(process.env.PORT ?? 4000);
const MONGODB_URI = process.env.MONGODB_URI;
const RAW_REDIS_URL = process.env.REDIS_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL;

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI in environment.");
}

if (!RAW_REDIS_URL) {
  throw new Error("Missing REDIS_URL in environment.");
}

if (!GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY in environment.");
}

const normalizeRedisUrl = (value: string) => {
  const trimmed = value.trim();
  const matchedUrl = trimmed.match(/(rediss?:\/\/\S+)/i)?.[1] ?? trimmed;

  try {
    const parsed = new URL(matchedUrl);
    if (!["redis:", "rediss:"].includes(parsed.protocol)) {
      throw new Error("Unsupported Redis protocol.");
    }
    return parsed.toString();
  } catch {
    throw new Error(
      "Invalid REDIS_URL. Use a plain redis:// or rediss:// URL, not a redis-cli command."
    );
  }
};

const REDIS_URL = normalizeRedisUrl(RAW_REDIS_URL);

const questionRowSchema = z.object({
  type: z.string().min(1),
  count: z.number().int().positive(),
  marks: z.number().positive(),
});

const assignmentSchema = z.object({
  assignmentId: z.string().min(1),
  assignmentTitle: z.string().min(1),
  subject: z.string().min(1),
  className: z.string().optional(),
  timeAllowed: z.string().optional(),
  topic: z.string().min(1),
  rows: z.array(questionRowSchema).min(1),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  instructions: z.array(z.string()).default([]),
});

type AssignmentPayload = z.infer<typeof assignmentSchema>;

const generatedPaperSchema = z.object({
  sections: z
    .array(
      z.object({
        title: z.string().min(1),
        instruction: z.string().min(1),
        questions: z
          .array(
            z.object({
              text: z.string().min(1),
              difficulty: z.string().min(1),
              marks: z.number().positive(),
            })
          )
          .min(1),
      })
    )
    .min(1),
});

type GeneratedPaper = z.infer<typeof generatedPaperSchema>;

const GeneratedPaperSchema = new mongoose.Schema(
  {
    jobId: { type: String, required: true, unique: true },
    request: { type: mongoose.Schema.Types.Mixed, required: true },
    result: { type: mongoose.Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["completed", "failed"], required: true },
  },
  { timestamps: true }
);

const GeneratedPaper = mongoose.model("GeneratedPaper", GeneratedPaperSchema);

const redisConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const queueName = "question-generator";
const questionGeneratorQueue = new Queue(queueName, { connection: redisConnection as any });
const queueEvents = new QueueEvents(queueName, { connection: redisConnection as any });

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const extractJsonString = (rawText: string) => {
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  const candidate = (fenced ?? rawText).trim();
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    throw new Error("Gemini response does not contain valid JSON object content.");
  }

  return candidate.slice(firstBrace, lastBrace + 1);
};

const buildGeminiPrompt = (payload: AssignmentPayload) => {
  const rows = payload.rows
    .map((row, index) => `${index + 1}. ${row.type} | count=${row.count} | marks=${row.marks}`)
    .join("\n");

  return [
    "You are generating a school question paper.",
    "Return ONLY a valid JSON object. No markdown. No explanation. No code fences.",
    'Use exactly this schema: {"sections":[{"title":"string","instruction":"string","questions":[{"text":"string","difficulty":"string","marks":number}]}]}',
    "All fields are required.",
    "Difficulty should be one of: easy, medium, hard.",
    "Marks must be numeric and positive.",
    "Ensure question counts and marks match each requested row.",
    "",
    `Assignment title: ${payload.assignmentTitle}`,
    `Subject: ${payload.subject}`,
    `Class: ${payload.className ?? "N/A"}`,
    `Time allowed: ${payload.timeAllowed ?? "N/A"}`,
    `Topic/context: ${payload.topic}`,
    `Additional instructions: ${payload.instructions.join(" | ") || "None"}`,
    "Rows:",
    rows,
  ].join("\n");
};

const generatePaperJson = async (payload: AssignmentPayload): Promise<GeneratedPaper> => {
  const prompt = buildGeminiPrompt(payload);
  const modelCandidates = [
    GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
  ].filter((model): model is string => Boolean(model && model.trim()));

  let lastError: unknown;

  for (const candidate of modelCandidates) {
    try {
      const model = genAI.getGenerativeModel({ model: candidate });
      const response = await model.generateContent(prompt);
      const rawText = response.response.text();
      const jsonText = extractJsonString(rawText);

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        throw new Error("Gemini returned invalid JSON.");
      }

      const validated = generatedPaperSchema.safeParse(parsed);
      if (!validated.success) {
        throw new Error(`Gemini JSON schema mismatch: ${validated.error.message}`);
      }

      return validated.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `No compatible Gemini model found for generateContent. Set GEMINI_MODEL in server/.env to a supported model for your key. Last error: ${
      lastError instanceof Error ? lastError.message : "unknown error"
    }`
  );
};

const worker = new Worker(
  queueName,
  async (job: Job<AssignmentPayload>) => {
    // Simulate model latency; replace with OpenAI/Gemini call if needed.
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const result = await generatePaperJson(job.data);

    await GeneratedPaper.create({
      jobId: job.id,
      request: job.data,
      result,
      status: "completed",
    });

    return result;
  },
  { connection: redisConnection as any }
);

worker.on("failed", async (job, err) => {
  if (!job) return;
  await GeneratedPaper.create({
    jobId: job.id,
    request: job.data,
    result: { error: err.message },
    status: "failed",
  }).catch(() => undefined);
});

queueEvents.on("completed", async ({ jobId }) => {
  const completedJob = await questionGeneratorQueue.getJob(jobId);
  const returnValue = await completedJob?.returnvalue;

  io.emit("JOB_COMPLETED", {
    jobId,
    assignmentId: completedJob?.data?.assignmentId ?? null,
    paper: returnValue ?? null,
  });
});

queueEvents.on("failed", async ({ jobId, failedReason }) => {
  const failedJob = await questionGeneratorQueue.getJob(jobId);

  io.emit("JOB_FAILED", {
    jobId,
    assignmentId: failedJob?.data?.assignmentId ?? null,
    error: failedReason ?? "Unknown worker error",
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/generate", async (req, res) => {
  const parsed = assignmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid payload",
      issues: parsed.error.issues,
    });
  }

  const job = await questionGeneratorQueue.add("generate-paper", parsed.data, {
    removeOnComplete: true,
    removeOnFail: false,
  });

  return res.status(202).json({
    message: "Generation job queued",
    jobId: job.id,
    queue: queueName,
  });
});

app.get("/api/generate/:jobId", async (req, res) => {
  const { jobId } = req.params;
  const saved = await GeneratedPaper.findOne({ jobId }).lean();

  if (saved) {
    if (saved.status === "completed") {
      return res.json({
        status: "completed",
        paper: saved.result,
      });
    }

    return res.json({
      status: "failed",
      error:
        typeof saved.result === "object" &&
        saved.result &&
        "error" in (saved.result as Record<string, unknown>)
          ? String((saved.result as Record<string, unknown>).error)
          : "Question paper generation failed.",
    });
  }

  const queuedJob = await questionGeneratorQueue.getJob(jobId);
  if (!queuedJob) {
    return res.status(404).json({ status: "not_found", message: "Job not found." });
  }

  const state = await queuedJob.getState();
  return res.json({ status: state === "failed" ? "failed" : "pending" });
});

const start = async () => {
  await mongoose.connect(MONGODB_URI);
  await queueEvents.waitUntilReady();

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Socket.io ready for JOB_COMPLETED events.`);
  });
};

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
