'use client';

import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3010/api';
const SOCKET_BASE = API_BASE.replace(/\/api$/, '');
const STORE_SLUG = 'oggi-sao-jose';

type AdminSession = {
  token: string;
  role: string;
  fullName: string;
};

type OrderRow = {
  id: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  customer: {
    fullName: string;
    email: string;
  };
  items: Array<{
    productName: string;
    quantity: number;
  }>;
};

const statuses = ['aguardando_pagamento', 'pago', 'aceito_loja', 'em_preparo', 'pronto', 'em_entrega', 'entregue'];

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export default function StorePanelPage() {
  const [email, setEmail] = useState('loja@oggi.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [message, setMessage] = useState('');

  const canUsePanel = useMemo(() => {
    return session?.role === 'store_admin' || session?.role === 'attendant' || session?.role === 'super_admin';
  }, [session]);

  // WebSocket listener para auto-atualizar pedidos
  useEffect(() => {
    if (!session?.token) return;

    const socket = io(SOCKET_BASE, { transports: ['websocket'] });

    socket.on('order:updated', (payload: { id?: string; orderId?: string; status?: string }) => {
      const eventOrderId = payload.id ?? payload.orderId;
      // Se há filtro de status e o novo status não bate, não recarrega
      const statusBateu = !selectedStatus || payload.status === selectedStatus;
      
      if (eventOrderId && statusBateu) {
        // Auto-reload orders (aguarda um pouco para sincronizar com banco)
        setTimeout(() => loadOrders(), 500);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [session?.token, selectedStatus]);

  const signIn = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Falha ao autenticar usuário da loja.');
      }

      const payload = (await response.json()) as {
        accessToken: string;
        user: { role: string; fullName: string };
      };

      setSession({
        token: payload.accessToken,
        role: payload.user.role,
        fullName: payload.user.fullName,
      });

      setMessage('Login de loja realizado.');
    } catch {
      setMessage('Não foi possível entrar no painel.');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    if (!session?.token) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const query = selectedStatus ? `?storeSlug=${STORE_SLUG}&status=${selectedStatus}` : `?storeSlug=${STORE_SLUG}`;
      const response = await fetch(`${API_BASE}/orders${query}`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar pedidos da loja.');
      }

      const payload = (await response.json()) as OrderRow[];
      setOrders(payload);
      setMessage(`${payload.length} pedido(s) carregado(s).`);
    } catch {
      setMessage('Erro ao listar pedidos.');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    if (!session?.token) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar status.');
      }

      setMessage(`Pedido ${orderId.slice(0, 8)} atualizado para ${status}.`);
      await loadOrders();
    } catch {
      setMessage('Não foi possível atualizar o status do pedido.');
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.12),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#fff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">Painel da loja</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Operação em tempo real da Oggi São José</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Esta tela permite login da loja, listagem de pedidos e avanço de status para alimentar o tracking do cliente.
          </p>

          {!session && (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="E-mail admin"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Senha"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              />
              <button
                onClick={signIn}
                disabled={loading}
                className="rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white disabled:opacity-60"
              >
                {loading ? 'Entrando...' : 'Entrar no painel'}
              </button>
            </div>
          )}

          {session && (
            <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              >
                <option value="">Todos os status</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <button
                onClick={loadOrders}
                disabled={loading || !canUsePanel}
                className="rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white disabled:opacity-60"
              >
                {loading ? 'Carregando...' : 'Atualizar pedidos'}
              </button>

              <button
                onClick={() => {
                  setSession(null);
                  setOrders([]);
                }}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900"
              >
                Sair
              </button>
            </div>
          )}

          {session && (
            <p className="mt-4 text-sm text-slate-600">
              Usuário: <strong>{session.fullName}</strong> ({session.role})
            </p>
          )}

          {message && <p className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>}
        </section>

        <section className="mt-6 grid gap-4">
          {orders.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              Nenhum pedido carregado. Faça login e clique em "Atualizar pedidos".
            </div>
          )}

          {orders.map((order) => (
            <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-950">Pedido #{order.id.slice(0, 8)}</p>
                  <p className="mt-1 text-sm text-slate-600">Cliente: {order.customer.fullName} ({order.customer.email})</p>
                  <p className="mt-1 text-sm text-slate-600">Total: {money(order.totalAmount)}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-slate-900">{order.status}</p>
                  <p className="text-slate-500">Pagamento: {order.paymentStatus}</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                {order.items.map((item) => (
                  <p key={`${order.id}-${item.productName}`}>• {item.quantity}x {item.productName}</p>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => void updateStatus(order.id, status)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      order.status === status
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
