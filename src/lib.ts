export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  iban: string;
  balance: number;
  salary: number;
  must_change_password?: number;
};
export type Transaction = {
  id: string;
  sender: string | null;
  recipient: string | null;
  amount: number;
  kind: string;
  note: string;
  created_at: string;
  sender_name?: string;
  recipient_name?: string;
};
export const money = (n: number) => {
  const value = Math.abs(n);
  return (
    (n < 0 ? "−" : "") +
    Math.floor(value / 100)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".") +
    "," +
    String(value % 100).padStart(2, "0")
  );
};
export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  const r = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d: any = await r.json();
  if (!r.ok) throw new Error(d.error || "Lidhja dështoi.");
  return d;
}
export const demoTransactions: Transaction[] = [
  {
    id: "demo-1",
    sender: null,
    recipient: "demo",
    amount: 8500000,
    kind: "salary",
    note: "Pagë mujore · Tetor",
    created_at: "2026-10-20 09:00:00",
    sender_name: "AFA Academy",
  },
  {
    id: "demo-2",
    sender: "demo",
    recipient: "other",
    amount: 125000,
    kind: "transfer",
    note: "Transfertë virtuale",
    created_at: "2026-10-19 14:30:00",
    recipient_name: "Elira Hoxha",
  },
  {
    id: "demo-3",
    sender: "other",
    recipient: "demo",
    amount: 450000,
    kind: "transfer",
    note: "Projekt i përbashkët",
    created_at: "2026-10-18 10:15:00",
    sender_name: "Arben Dervishi",
  },
];
