import type { RunSlot } from "@/types/database";

export const SLOT_LABELS: Record<RunSlot, { label: string; school: string; time: string; type: "drop" | "pick" }> = {
  a_dropoff: { label: "Redeemer Drop-off", school: "A", time: "8:30am", type: "drop" },
  a_pickup:  { label: "Redeemer Pick-up",  school: "A", time: "3:10pm", type: "pick" },
  b_dropoff: { label: "Trinity Drop-off",  school: "B", time: "8:45am", type: "drop" },
  b_pickup:  { label: "Trinity Pick-up",   school: "B", time: "3:20pm", type: "pick" },
};

export const SLOT_ORDER: RunSlot[] = ["a_dropoff", "b_dropoff", "a_pickup", "b_pickup"];
