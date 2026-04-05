'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { io } from 'socket.io-client';
import { loadSession } from '@/lib/session';
import { trackingSteps } from '@/lib/customer-data';
import { mapTrackingStep } from '@/lib/tracking-status';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3010/api';
const SOCKET_BASE = API_BASE.replace(/\/api$/, '');

const fallbackOrderId = 'OGGI-2481';

type TrackingResponse = {
  orderId: string;
  orderStatus: string;
  delivery: null | {
    id: string;
    status: string;
    courierId: string;
  };
  lastLocation: null | {
    lat: number;
    lng: number;
    capturedAt: string;
  };
  updatedAt: string;
};

function TrackingPageContent() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get('orderId') ?? fallbackOrderId);
  const [trackingIndex, setTrackingIndex] = useState(0);
  const [orderStatus, setOrderStatus] = useState('aguardando_pagamento');
  const [deliveryStatus, setDeliveryStatus] = useState('aguardando_motoboy');
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [error, setError] = useState('');

  const session = useMemo(() => loadSession(), []);

  const loadTracking = async (currentOrderId: string) => {
    if (!session?.token || !currentOrderId) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/tracking/${currentOrderId}`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        setError('Não foi possível carregar o rastreio para esse pedido.');
        return;
      }

      const payload = (await response.json()) as TrackingResponse;
      setOrderStatus(payload.orderStatus);
      setDeliveryStatus(payload.delivery?.status ?? 'aguardando_motoboy');
      setTrackingIndex(mapTrackingStep(payload.orderStatus, payload.delivery?.status));

      if (payload.lastLocation) {
        setLastLocation({ lat: payload.lastLocation.lat, lng: payload.lastLocation.lng });
      }

      setError('');
    } catch {
      setError('Falha de conexão com o backend de rastreio.');
    }
  };

  useEffect(() => {
    const fromSession = session?.lastOrderId;
    if (fromSession && !searchParams.get('orderId')) {
      setOrderId(fromSession);
      void loadTracking(fromSession);
      return;
    }

    if (searchParams.get('orderId')) {
      void loadTracking(searchParams.get('orderId')!);
    }
  }, [searchParams, session]);

  useEffect(() => {
    if (!session?.token) {
      return;
    }

    const socket = io(SOCKET_BASE, {
      transports: ['websocket'],
    });

    socket.on('realtime:connected', () => {
      setEvents((current) => [
        `Conectado ao realtime em ${new Date().toLocaleTimeString('pt-BR')}`,
        ...current,
      ].slice(0, 5));
    });

    socket.on('order:updated', (payload: { id?: string; orderId?: string; status?: string }) => {
      const eventOrderId = payload.id ?? payload.orderId;
      if (!eventOrderId || eventOrderId !== orderId) {
        return;
      }

      if (payload.status) {
        setOrderStatus(payload.status);
        setTrackingIndex(mapTrackingStep(payload.status, deliveryStatus));
      }

      setEvents((current) => [`Pedido atualizado: ${payload.status ?? 'status alterado'}`, ...current].slice(0, 5));
    });

    socket.on(
      'delivery:updated',
      (payload: { orderId?: string; status?: string; courierId?: string; id?: string }) => {
        if (!payload.orderId || payload.orderId !== orderId) {
          return;
        }

        if (payload.status) {
          setDeliveryStatus(payload.status);
          setTrackingIndex(mapTrackingStep(orderStatus, payload.status));
        }

        setEvents((current) => [
          `Entrega atualizada: ${payload.status ?? 'status alterado'}`,
          ...current,
        ].slice(0, 5));
      },
    );

    socket.on('courier:location-updated', (payload: { lat?: number; lng?: number; orderId?: string }) => {
      if (payload.orderId && payload.orderId !== orderId) {
        return;
      }

      if (typeof payload.lat === 'number' && typeof payload.lng === 'number') {
        setLastLocation({ lat: payload.lat, lng: payload.lng });
      }

      setEvents((current) => ['Nova localização do motoboy recebida', ...current].slice(0, 5));
    });

    socket.on('payment:updated', (payload: { orderId?: string; status?: string }) => {
      if (payload.orderId && payload.orderId !== orderId) {
        return;
      }

      setEvents((current) => [`Pagamento atualizado: ${payload.status ?? 'evento recebido'}`, ...current].slice(0, 5));
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId, session?.token, deliveryStatus, orderStatus]);

  const progress = useMemo(() => trackingSteps.slice(0, trackingIndex + 1), [trackingIndex]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(243,93,102,0.16),_transparent_35%),linear-gradient(180deg,#fffaf4_0%,#fff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">Tracking</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Acompanhe seu pedido em tempo real</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Esta tela já usa token de sessão do cliente, consulta o backend e recebe eventos ao vivo do WebSocket.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <span className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Número do pedido</span>
              <input
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
                className="mt-1 w-full bg-transparent text-lg font-semibold text-slate-950 outline-none"
              />
            </label>
            <button
              onClick={() => void loadTracking(orderId)}
              className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            >
              Consultar
            </button>
            <button
              onClick={() => setTrackingIndex((current) => Math.min(trackingSteps.length - 1, current + 1))}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-4 text-sm font-semibold text-slate-900"
            >
              Simular
            </button>
          </div>

          {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <div className="mt-6 rounded-[1.75rem] bg-gradient-to-br from-rose-500 via-orange-400 to-amber-200 p-5 text-white shadow-lg shadow-rose-200/70">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">Pedido ativo</p>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-3xl font-black tracking-tight">#{orderId}</p>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/90">Status do pedido: {orderStatus} | Entrega: {deliveryStatus}</p>
              </div>
              <div className="rounded-3xl bg-white/20 px-4 py-3 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-white/80">Etapa</p>
                <p className="mt-1 text-lg font-bold">{trackingSteps[trackingIndex].label}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {trackingSteps.map((step, index) => {
              const active = index <= trackingIndex;
              return (
                <div key={step.label} className={`flex items-start gap-3 rounded-2xl border p-4 ${active ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
                  <div className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${active ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">{step.label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{step.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {progress.map((step) => (
              <div key={step.label} className="rounded-3xl bg-slate-950 p-4 text-white">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Atual</p>
                <p className="mt-2 font-semibold">{step.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Última posição recebida</p>
            <p className="mt-2 text-sm text-slate-700">
              {lastLocation
                ? `Lat: ${lastLocation.lat.toFixed(6)} | Lng: ${lastLocation.lng.toFixed(6)}`
                : 'Ainda não recebemos localização do motoboy para este pedido.'}
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Eventos realtime recentes</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {events.length === 0 && <li>Nenhum evento recebido ainda.</li>}
              {events.map((event, index) => (
                <li key={`${event}-${index}`}>• {event}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function TrackingPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(243,93,102,0.16),_transparent_35%),linear-gradient(180deg,#fffaf4_0%,#fff_100%)] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/70 bg-white/85 p-6 text-slate-600 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
            Carregando rastreio...
          </div>
        </main>
      }
    >
      <TrackingPageContent />
    </Suspense>
  );
}
