import { useState, useEffect, useCallback } from "react";
import { Thesis, ThesisBodyBlock, ThesisEvidence, ThesisConviction, ThesisStatus } from "@/lib/thesis";
import { supabase } from "@/integrations/supabase/client";

interface ContentPayload {
  summary?: string;
  conviction?: string;
  tickers?: string[];
  body?: ThesisBodyBlock[];
  evidence?: ThesisEvidence[];
  horizon?: string;
  tags?: string[];
}

function dbRowToThesis(row: {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
}): Thesis {
  let payload: ContentPayload = {};
  try { payload = JSON.parse(row.content || "{}"); } catch { /* ignore */ }
  return {
    id: row.id,
    title: row.title,
    summary: payload.summary ?? "",
    conviction: (payload.conviction ?? "med") as ThesisConviction,
    status: (row.status ?? "active") as ThesisStatus,
    tickers: payload.tickers ?? [],
    body: payload.body ?? [],
    evidence: payload.evidence ?? [],
    horizon: payload.horizon ?? "",
    tags: payload.tags ?? [],
    createdAt: row.created_at.split("T")[0],
  };
}

function toContent(fields: Partial<Omit<Thesis, "id" | "createdAt" | "title" | "status">>): string {
  const payload: ContentPayload = {
    summary: fields.summary,
    conviction: fields.conviction,
    tickers: fields.tickers,
    body: fields.body,
    evidence: fields.evidence,
    horizon: fields.horizon,
    tags: fields.tags,
  };
  return JSON.stringify(payload);
}

export function useTheses() {
  const [theses, setTheses] = useState<Thesis[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("theses")
      .select("*")
      .order("created_at", { ascending: false });
    setTheses((data ?? []).map(dbRowToThesis));
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addThesis = async (fields: Omit<Thesis, "id" | "createdAt">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("theses").insert({
      user_id: user.id,
      title: fields.title,
      status: fields.status,
      content: toContent(fields),
    });
    load();
  };

  const updateThesis = async (id: string, updates: Partial<Thesis>) => {
    const existing = theses.find((t) => t.id === id);
    const merged = { ...existing, ...updates } as Thesis;
    await supabase.from("theses").update({
      updated_at: new Date().toISOString(),
      content: toContent(merged),
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.status !== undefined && { status: updates.status }),
    }).eq("id", id);
    load();
  };

  const deleteThesis = async (id: string) => {
    await supabase.from("theses").delete().eq("id", id);
    load();
  };

  return { theses, isLoading, addThesis, updateThesis, deleteThesis };
}
