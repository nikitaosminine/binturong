import { useState, useEffect, useCallback } from "react";
import { Thesis, ThesisBodyBlock, ThesisEvidence, ThesisConviction, ThesisStatus } from "@/lib/thesis";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";

function dbRowToThesis(row: {
  id: string;
  title: string;
  summary: string;
  conviction: string;
  status: string;
  tickers: string[];
  body: Json;
  evidence: Json;
  horizon: string;
  tags: string[];
  created_at: string;
}): Thesis {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    conviction: row.conviction as ThesisConviction,
    status: row.status as ThesisStatus,
    tickers: row.tickers,
    body: (row.body as unknown as ThesisBodyBlock[]) ?? [],
    evidence: (row.evidence as unknown as ThesisEvidence[]) ?? [],
    horizon: row.horizon,
    tags: row.tags,
    createdAt: row.created_at.split("T")[0],
  };
}

function thesisToRow(fields: Partial<Omit<Thesis, "id" | "createdAt">>) {
  const row: Record<string, unknown> = {};
  if (fields.title !== undefined) row.title = fields.title;
  if (fields.summary !== undefined) row.summary = fields.summary;
  if (fields.conviction !== undefined) row.conviction = fields.conviction;
  if (fields.status !== undefined) row.status = fields.status;
  if (fields.tickers !== undefined) row.tickers = fields.tickers;
  if (fields.body !== undefined) row.body = fields.body as unknown as Json;
  if (fields.evidence !== undefined) row.evidence = fields.evidence as unknown as Json;
  if (fields.horizon !== undefined) row.horizon = fields.horizon;
  if (fields.tags !== undefined) row.tags = fields.tags;
  return row;
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
    if (!user) { toast.error("Not authenticated"); return; }
    const { error } = await supabase.from("theses").insert({
      user_id: user.id,
      title: fields.title,
      content: fields.summary ?? "",
      summary: fields.summary,
      conviction: fields.conviction,
      status: fields.status,
      tickers: fields.tickers,
      body: fields.body as unknown as Json,
      evidence: fields.evidence as unknown as Json,
      horizon: fields.horizon,
      tags: fields.tags,
    });
    if (error) { toast.error(error.message); return; }
    load();
  };

  const updateThesis = async (id: string, updates: Partial<Thesis>) => {
    const { error } = await supabase
      .from("theses")
      .update({ ...thesisToRow(updates), updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const deleteThesis = async (id: string) => {
    const { error } = await supabase.from("theses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return { theses, isLoading, addThesis, updateThesis, deleteThesis };
}
