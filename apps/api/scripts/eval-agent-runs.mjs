#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

function printHelp() {
  console.log(`Agent Run Evaluation Harness

Usage:
  npm --prefix apps/api run eval:agent -- [--user <uuid>] [--hours <n>] [--limit <n>] [--json]

Environment variables required:
  SUPABASE_URL
  SUPABASE_SERVICE_KEY

Examples:
  npm --prefix apps/api run eval:agent -- --hours 24
  npm --prefix apps/api run eval:agent -- --user bbf6... --hours 72 --json
`);
}

function parseArgs(argv) {
  const args = { user: null, hours: 24, limit: 500, json: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--user") args.user = argv[++i] ?? null;
    else if (arg === "--hours") args.hours = Number(argv[++i] ?? 24);
    else if (arg === "--limit") args.limit = Number(argv[++i] ?? 500);
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
  }
  return args;
}

function scoreRun(row) {
  const tokenUsage = row.token_usage ?? {};
  const mainAgent = tokenUsage.main_agent ?? {};
  const subAgent = tokenUsage.sub_agent ?? {};
  const signals = Array.isArray(mainAgent.signals) ? mainAgent.signals : [];
  const findings = Array.isArray(subAgent.findings) ? subAgent.findings : [];
  const toolCalls = Array.isArray(tokenUsage.tool_calls) ? tokenUsage.tool_calls : [];

  const schemaValid = signals.length > 0 && findings.length > 0;
  const signalCompleteness = signals.filter((signal) =>
    signal?.thesis_id && signal?.signal_type && signal?.title && signal?.explanation,
  ).length;
  const findingCompleteness = findings.filter((finding) =>
    finding?.thesis_id &&
    finding?.signal_type &&
    finding?.title &&
    finding?.explanation &&
    typeof finding?.relevance_score === "number",
  ).length;
  const consistencyScore =
    signals.length + findings.length > 0
      ? (signalCompleteness + findingCompleteness) / (signals.length + findings.length)
      : 0;

  const durationMs =
    row.started_at && row.finished_at
      ? new Date(row.finished_at).getTime() - new Date(row.started_at).getTime()
      : null;

  return {
    runId: row.id,
    status: row.status,
    schemaValid,
    consistencyScore,
    signalCount: signals.length,
    findingCount: findings.length,
    toolCallCount: toolCalls.length,
    durationMs,
    errorCode: row.error_code ?? null,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required");
  }

  const client = createClient(url, serviceKey);
  const fromIso = new Date(Date.now() - Math.max(1, args.hours) * 60 * 60 * 1000).toISOString();

  let query = client
    .from("agent_runs")
    .select("id,status,error_code,token_usage,started_at,finished_at,created_at,user_id")
    .gte("created_at", fromIso)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, args.limit));

  if (args.user) query = query.eq("user_id", args.user);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const scored = (data ?? []).map(scoreRun);
  const completed = scored.filter((run) => run.status === "completed");
  const failed = scored.filter((run) => run.status === "failed" || run.status === "failed_validation");
  const schemaValidRuns = completed.filter((run) => run.schemaValid);
  const averageConsistency =
    completed.length > 0
      ? completed.reduce((sum, run) => sum + run.consistencyScore, 0) / completed.length
      : 0;
  const avgDurationMs =
    completed.length > 0
      ? completed
          .filter((run) => run.durationMs != null)
          .reduce((sum, run) => sum + (run.durationMs ?? 0), 0) / completed.length
      : 0;

  const summary = {
    evaluated_at: new Date().toISOString(),
    window_hours: args.hours,
    total_runs: scored.length,
    completed_runs: completed.length,
    failed_runs: failed.length,
    schema_valid_rate: completed.length > 0 ? schemaValidRuns.length / completed.length : 0,
    avg_consistency_score: averageConsistency,
    avg_duration_ms: avgDurationMs,
    avg_tool_calls:
      completed.length > 0
        ? completed.reduce((sum, run) => sum + run.toolCallCount, 0) / completed.length
        : 0,
    failures_by_code: failed.reduce((acc, run) => {
      const key = run.errorCode ?? "UNKNOWN";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  };

  if (args.json) {
    console.log(JSON.stringify({ summary, runs: scored }, null, 2));
    return;
  }

  console.log("\nAgent Evaluation Summary");
  console.log("========================");
  console.log(`Window hours:       ${summary.window_hours}`);
  console.log(`Total runs:         ${summary.total_runs}`);
  console.log(`Completed runs:     ${summary.completed_runs}`);
  console.log(`Failed runs:        ${summary.failed_runs}`);
  console.log(`Schema valid rate:  ${(summary.schema_valid_rate * 100).toFixed(1)}%`);
  console.log(`Consistency score:  ${(summary.avg_consistency_score * 100).toFixed(1)}%`);
  console.log(`Avg duration:       ${Math.round(summary.avg_duration_ms)} ms`);
  console.log(`Avg tool calls:     ${summary.avg_tool_calls.toFixed(2)}`);
  console.log("Failures by code:", summary.failures_by_code);
  console.log("\nTip: use --json for machine-readable output.\n");
}

main().catch((error) => {
  console.error("Evaluation failed:", error.message);
  process.exit(1);
});
