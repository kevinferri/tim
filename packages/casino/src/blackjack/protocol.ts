import { TableRef } from "../table";
import { BlackjackPlayAction } from "./engine";

export type BlackjackTableAction =
  { type: "bet"; amount: number } | { type: BlackjackPlayAction };

export type TableActionPayload = TableRef & { action: BlackjackTableAction };
