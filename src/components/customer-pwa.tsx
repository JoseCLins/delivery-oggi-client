'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import {
  benefits,
  categories,
  featuredProducts,
  quickStats,
  stores,
  trackingSteps,
  type CategoryKey,
  type ProductCard,
} from '@/lib/customer-data';
import { clearSession, loadSession, saveSession, type CustomerSession } from '@/lib/session';
import { mapTrackingStep } from '@/lib/tracking-status';

type BackendProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
};

type CartItem = ProductCard & { quantity: number };

type PixCharge = {
  orderId: string;
  txid: string;
  qrCodeText: string;
  qrCodeImageUrl: string;
  amount: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3010/api';
const SOCKET_BASE = API_BASE.replace(/\/api$/, '');

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function getCatalog(backendProducts: BackendProduct[]): ProductCard[] {
  if (!backendProducts.length) {
    return featuredProducts;
  }

  return backendProducts.map((product, index) => {
    const style = featuredProducts[index % featuredProducts.length];

    return {
      ...style,
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
    };
  });
}

export function CustomerPwa({ backendProducts }: { backendProducts: BackendProduct[] }) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('Todos');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [trackingIndex, setTrackingIndex] = useState(2);
  const [activeStore, setActiveStore] = useState(stores[0].slug);

  const [session, setSession] = useState<CustomerSession | null>(null);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [pixCharge, setPixCharge] = useState<PixCharge | null>(null);
  const [liveOrderStatus, setLiveOrderStatus] = useState('aguardando_pagamento');
  const [liveDeliveryStatus, setLiveDeliveryStatus] = useState('aguardando_motoboy');
  const [liveEvents, setLiveEvents] = useState<string[]>([]);

  useEffect(() => {
    const currentSession = loadSession();
    if (currentSession) {
      setSession(currentSession);
  useEffect(() => {
    if (!session?.lastOrderId) {
      return;
    }

    const socket = io(SOCKET_BASE, {
      transports: ['websocket'],
    });

    socket.on('realtime:connected', () => {
      setLiveEvents((current) => [
        `Realtime conectado em ${new Date().toLocaleTimeString('pt-BR')}`,
        ...current,
      ].slice(0, 4));
    });

    socket.on('order:updated', (payload: { id?: string; orderId?: string; status?: string }) => {
      const eventOrderId = payload.id ?? payload.orderId;
      if (!eventOrderId || eventOrderId !== session.lastOrderId) {
        return;
      }

      if (payload.status) {
        setLiveOrderStatus(payload.status);
        setTrackingIndex(mapTrackingStep(payload.status, liveDeliveryStatus));
      }

      setLiveEvents((current) => [
        `Pedido: ${payload.status ?? 'atualizado'}`,
        ...current,
      ].slice(0, 4));
    });

    socket.on('delivery:updated', (payload: { orderId?: string; status?: string }) => {
      if (!payload.orderId || payload.orderId !== session.lastOrderId) {
        return;
      }

      if (payload.status) {
        setLiveDeliveryStatus(payload.status);
        setTrackingIndex(mapTrackingStep(liveOrderStatus, payload.status));
      }

      setLiveEvents((current) => [
        `Entrega: ${payload.status ?? 'atualizada'}`,
        ...current,
      ].slice(0, 4));
    });

    socket.on('payment:updated', (payload: { orderId?: string; status?: string }) => {
      if (payload.orderId && payload.orderId !== session.lastOrderId) {
        return;
      }

      setLiveEvents((current) => [
        `Pagamento: ${payload.status ?? 'evento recebido'}`,
        ...current,
      ].slice(0, 4));
    });

    return () => {
      socket.disconnect();
    };
  }, [session?.lastOrderId, liveDeliveryStatus, liveOrderStatus]);

    }
  }, []);

  const displayProducts = useMemo(() => getCatalog(backendProducts), [backendProducts]);

  const filteredProducts = displayProducts.filter((product) => {
    const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
    const matchesQuery =
      query.trim().length === 0 ||
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      product.description.toLowerCase().includes(query.toLowerCase());

    return matchesCategory && matchesQuery;
  });

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const deliveryFee = cartTotal > 0 ? 6 : 0;
  const orderTotal = cartTotal + deliveryFee;

  const addToCart = (product: ProductCard) => {
    setErrorMessage('');
    setSuccessMessage('');

    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.id === product.id);

      if (existing) {
        return currentCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((currentCart) => currentCart.filter((item) => item.id !== productId));
  };

  const changeQuantity = (productId: string, delta: number) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === productId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item,
      ),
    );
  };

  const simulateTrackingAdvance = () => {
    setTrackingIndex((current) => Math.min(trackingSteps.length - 1, current + 1));
  };

  const handleRegister = async () => {
    if (!authName || !authEmail || !authPassword) {
      setErrorMessage('Preencha nome, e-mail e senha para cadastrar.');
      return;
    }

    setAuthLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: authName,
          email: authEmail,
          password: authPassword,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string | string[] };
        const message = Array.isArray(payload.message)
          ? payload.message.join(' | ')
          : payload.message ?? 'Falha ao cadastrar cliente.';
        throw new Error(message);
      }

      const payload = (await response.json()) as { accessToken: string; user: CustomerSession['user'] };
      const nextSession: CustomerSession = {
        token: payload.accessToken,
        user: payload.user,
      };

      saveSession(nextSession);
      setSession(nextSession);
      setSuccessMessage('Cadastro concluído. Você já pode finalizar o pedido.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado no cadastro.';
      setErrorMessage(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!authEmail || !authPassword) {
      setErrorMessage('Informe e-mail e senha para entrar.');
      return;
    }

    setAuthLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string | string[] };
        const message = Array.isArray(payload.message)
          ? payload.message.join(' | ')
          : payload.message ?? 'Falha ao entrar.';
        throw new Error(message);
      }

      const payload = (await response.json()) as { accessToken: string; user: CustomerSession['user'] };
      const nextSession: CustomerSession = {
        token: payload.accessToken,
        user: payload.user,
      };

      saveSession(nextSession);
      setSession(nextSession);
      setSuccessMessage('Login concluído com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado no login.';
      setErrorMessage(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setSuccessMessage('Sessão encerrada.');
  };

  const handleCheckoutPix = async () => {
    if (!session?.token) {
      setErrorMessage('Faça login para finalizar o pedido.');
      return;
    }

    if (!cart.length) {
      setErrorMessage('Adicione produtos no carrinho antes de finalizar.');
      return;
    }

    setCheckoutLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const orderResponse = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          storeSlug: activeStore,
          paymentMethod: 'pix',
          items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
        }),
      });

      if (!orderResponse.ok) {
        const payload = (await orderResponse.json().catch(() => ({}))) as { message?: string | string[] };
        const message = Array.isArray(payload.message)
          ? payload.message.join(' | ')
          : payload.message ?? 'Falha ao criar pedido.';
        throw new Error(message);
      }

      const order = (await orderResponse.json()) as { id: string; totalAmount: number; status: string };

      setLiveOrderStatus(order.status ?? 'aguardando_pagamento');
      setLiveDeliveryStatus('aguardando_motoboy');
      setTrackingIndex(mapTrackingStep(order.status, 'aguardando_motoboy'));

      const pixResponse = await fetch(`${API_BASE}/payments/pix/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          orderId: order.id,
          amount: order.totalAmount,
        }),
      });

      if (!pixResponse.ok) {
        const payload = (await pixResponse.json().catch(() => ({}))) as { message?: string | string[] };
        const message = Array.isArray(payload.message)
          ? payload.message.join(' | ')
          : payload.message ?? 'Falha ao gerar cobrança Pix.';
        throw new Error(message);
      }

      const pix = (await pixResponse.json()) as PixCharge;

      setPixCharge(pix);
      setLiveEvents((current) => [`Pix gerado para pedido ${pix.orderId}`, ...current].slice(0, 4));
      setCart([]);
      const nextSession = { ...session, lastOrderId: order.id };
      setSession(nextSession);
      saveSession(nextSession);
      setSuccessMessage('Pedido criado e Pix gerado com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado no checkout.';
      setErrorMessage(message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(243,93,102,0.16),_transparent_35%),linear-gradient(180deg,#fffaf4_0%,#fff_100%)] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-orange-400 to-amber-300 text-lg font-black text-white shadow-lg shadow-rose-200/70">
              O
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-500">Delivery Oggi</p>
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">PWA da loja para pedido, rastreio e Wi-Fi</h1>
            </div>
          </div>

          <div className="hidden items-center gap-3 rounded-full border border-slate-200 bg-slate-950 px-3 py-2 text-xs text-white shadow-sm lg:flex">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            {stores[0].city} pronta para receber pedidos
          </div>

          <a
            href="#cart"
            className="inline-flex items-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5"
          >
            Ver carrinho
          </a>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <article className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(243,93,102,0.2),_transparent_70%)]" />
            <div className="relative flex flex-col gap-6">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Experiência inspirada em marketplace, mas com a cara da Oggi
              </div>

              <div className="space-y-4">
                <h2 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                  Peça sorvetes, sobremesas e combos sem atrito. Abra no celular, finalize rápido e acompanhe a entrega.
                </h2>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  Esta versão já faz login real, cria pedido no backend e gera cobrança Pix. O próximo passo é ligar confirmação automática com a conta Itaú.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr]">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg shadow-sm">🔎</span>
                  <div className="flex-1">
                    <span className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Buscar</span>
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Digite um produto ou categoria"
                      className="mt-1 w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </label>

                <button className="rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-4 text-left text-white shadow-lg shadow-rose-200 transition hover:-translate-y-0.5">
                  <span className="block text-xs font-semibold uppercase tracking-[0.24em] text-rose-100">Atalho</span>
                  <span className="mt-1 block text-lg font-semibold">Entrar com cadastro da loja</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={session?.lastOrderId ? `/rastreio?orderId=${session.lastOrderId}` : '/rastreio'}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                >
                  Acompanhar pedido
                </Link>
                <Link
                  href="/wifi"
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  Liberar Wi-Fi
                </Link>
                <Link
                  href="/loja"
                  className="rounded-2xl border border-slate-300 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
                >
                  Painel da loja
                </Link>
              </div>

              {(errorMessage || successMessage) && (
                <div className={`rounded-2xl border px-4 py-3 text-sm ${errorMessage ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                  {errorMessage || successMessage}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-4">
                {quickStats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">{stat.label}</p>
                    <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <aside className="grid gap-4 rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_20px_80px_rgba(15,23,42,0.22)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-300">Cadastro do cliente</p>
              <h3 className="mt-3 text-2xl font-black tracking-tight">Login real ligado ao backend.</h3>
            </div>

            <div className="grid gap-3">
              <label className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-xs uppercase tracking-[0.24em] text-slate-300">Nome</span>
                <input
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                  placeholder="Seu nome"
                  className="mt-1 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
                />
              </label>

              <label className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-xs uppercase tracking-[0.24em] text-slate-300">E-mail</span>
                <input
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="voce@email.com"
                  className="mt-1 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
                />
              </label>

              <label className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-xs uppercase tracking-[0.24em] text-slate-300">Senha</span>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="mt-1 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
                />
              </label>
            </div>

            {!session ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  onClick={handleRegister}
                  disabled={authLoading}
                  className="rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {authLoading ? 'Cadastrando...' : 'Cadastrar'}
                </button>
                <button
                  onClick={handleLogin}
                  disabled={authLoading}
                  className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {authLoading ? 'Entrando...' : 'Entrar'}
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4">
                <p className="text-sm font-semibold text-emerald-200">Sessão ativa: {session.user.fullName}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.24em] text-emerald-100">Cliente autenticado</p>
                <button
                  onClick={handleLogout}
                  className="mt-3 rounded-xl border border-emerald-200/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white"
                >
                  Sair
                </button>
              </div>
            )}

            <div className="grid gap-3">
              {benefits.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <p className="text-sm leading-6 text-slate-200">{item}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-lg shadow-slate-950/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">Lojas</p>
                <h3 className="text-xl font-bold text-slate-950">Escolha a loja</h3>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">1 ativa agora</span>
            </div>

            <div className="mt-4 space-y-3">
              {stores.map((store) => {
                const isActive = activeStore === store.slug;
                return (
                  <button
                    key={store.slug}
                    onClick={() => setActiveStore(store.slug)}
                    className={`w-full rounded-3xl border p-4 text-left transition ${
                      isActive
                        ? 'border-rose-200 bg-rose-50 shadow-md shadow-rose-100'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-950">{store.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{store.city}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${store.open ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {store.open ? 'Aberta' : 'Em expansão'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-sm text-slate-600">
                      <span>{store.distance}</span>
                      <span>•</span>
                      <span>{store.deliveryTime}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-lg shadow-slate-950/5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">Categorias</p>
                <h3 className="text-xl font-bold text-slate-950">Navegação rápida, estilo app de delivery</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const active = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        active ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 text-white shadow-[0_20px_70px_rgba(15,23,42,0.14)]"
                >
                  <div className={`flex h-36 items-center justify-between bg-gradient-to-br ${product.accent} px-5 py-4`}>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/80">{product.badge}</p>
                      <p className="mt-2 text-4xl font-black tracking-tight">{product.imageLabel}</p>
                    </div>
                    <div className="rounded-2xl bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur">{money(product.price)}</div>
                  </div>
                  <div className="space-y-4 bg-white p-5 text-slate-950">
                    <div>
                      <p className="text-base font-bold tracking-tight">{product.name}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{product.description}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
                      <span>{product.category}</span>
                      <span>{product.calories ?? 'Pronto para personalizar'}</span>
                    </div>
                    <button
                      onClick={() => addToCart(product)}
                      className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                    >
                      Adicionar ao carrinho
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="cart" className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-lg shadow-slate-950/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">Carrinho</p>
                <h3 className="text-xl font-bold text-slate-950">Checkout curto e direto</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{cart.length} item(s)</span>
            </div>

            <div className="mt-5 space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{money(item.price)} cada</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => changeQuantity(item.id, -1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-bold text-slate-700">−</button>
                    <span className="min-w-8 text-center text-sm font-semibold text-slate-900">{item.quantity}</span>
                    <button onClick={() => changeQuantity(item.id, 1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-bold text-slate-700">+</button>
                    <button onClick={() => removeFromCart(item.id)} className="ml-2 text-sm font-semibold text-rose-500">Remover</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 rounded-3xl bg-slate-950 p-5 text-white sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Subtotal</p>
                <p className="mt-2 text-2xl font-black">{money(cartTotal)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Entrega</p>
                <p className="mt-2 text-2xl font-black">{money(deliveryFee)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Total</p>
                <p className="mt-2 text-2xl font-black text-emerald-300">{money(orderTotal)}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={handleCheckoutPix}
                disabled={checkoutLoading || !session}
                className="rounded-2xl bg-rose-500 px-5 py-3 font-semibold text-white shadow-lg shadow-rose-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checkoutLoading ? 'Gerando pedido...' : 'Finalizar com Pix'}
              </button>
              <button className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 transition hover:bg-slate-100">
                Salvar para depois
              </button>
            </div>

            {pixCharge && (
              <div className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Pix gerado</p>
                <p className="mt-2 text-sm text-emerald-800">Pedido: {pixCharge.orderId}</p>
                <p className="text-sm text-emerald-800">TXID: {pixCharge.txid}</p>
                <p className="text-sm text-emerald-800">Valor: {money(pixCharge.amount)}</p>
                {pixCharge.qrCodeImageUrl && (
                  <img
                    src={pixCharge.qrCodeImageUrl}
                    alt="QR Code Pix"
                    className="mt-3 h-40 w-40 rounded-2xl border border-emerald-200 bg-white p-2"
                  />
                )}
                <p className="mt-3 break-all text-xs leading-6 text-emerald-700">{pixCharge.qrCodeText}</p>
              </div>
            )}
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-lg shadow-slate-950/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">Rastreio</p>
                <h3 className="text-xl font-bold text-slate-950">Tempo real pronto para o cliente</h3>
              </div>
              <button
                onClick={simulateTrackingAdvance}
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5"
              >
                Avançar status
              </button>
            </div>

            <div className="mt-5 rounded-[1.75rem] bg-gradient-to-br from-rose-500 via-orange-400 to-amber-200 p-5 text-white shadow-lg shadow-rose-200/70">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">Pedido ativo</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-3xl font-black tracking-tight">#{session?.lastOrderId ?? 'OGGI-2481'}</p>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-white/90">Pedido: {liveOrderStatus} | Entrega: {liveDeliveryStatus} com atualização automática no app e no site.</p>
                </div>
                <div className="rounded-3xl bg-white/20 px-4 py-3 text-right backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/80">Status</p>
                  <p className="mt-1 text-lg font-bold">{trackingSteps[trackingIndex].label}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
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

            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Mapa do motoboy</p>
              <div className="mt-4 grid h-44 place-items-center rounded-[1.5rem] bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.28),_transparent_40%),linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] text-white">
                <div className="text-center">
                  <p className="text-lg font-semibold">Motoboy em rota</p>
                  <p className="mt-1 text-sm text-slate-300">Atualização ao vivo via WebSocket</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Eventos recentes</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {liveEvents.length === 0 && <li>Nenhum evento recebido ainda.</li>}
                  {liveEvents.map((event, index) => (
                    <li key={`${event}-${index}`}>• {event}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-950/5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">Wi-Fi da loja</p>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Cadastro antes de liberar a internet</h3>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
              Aqui entra o fluxo do captive portal: o cliente escaneia o QR Code, faz o cadastro no PWA e a loja libera o acesso à internet.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {['Escaneia QR', 'Faz cadastro', 'Libera Wi-Fi'].map((item, index) => (
                <div key={item} className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Passo {index + 1}</p>
                  <p className="mt-2 font-semibold text-slate-950">{item}</p>
                </div>
              ))}
            </div>
            <Link
              href="/wifi"
              className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:-translate-y-0.5"
            >
              Abrir cadastro do Wi-Fi
            </Link>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_20px_80px_rgba(15,23,42,0.22)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-300">Base pronta para crescer</p>
            <h3 className="mt-3 text-2xl font-black tracking-tight">Este PWA já nasce com mentalidade de plataforma.</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                'Login e cadastro reais no backend',
                'Checkout Pix conectado à API',
                'Sessão local com último pedido',
                'Rastreio pronto para receber eventos ao vivo',
              ].map((item) => (
                <div key={item} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm leading-6 text-slate-200">{item}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-7 text-slate-300">
              Na próxima etapa, o cliente vai ver o status do pedido mudando em tempo real na tela de rastreio sem precisar atualizar a página.
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}
