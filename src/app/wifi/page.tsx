'use client';

import { useState } from 'react';

export default function WifiPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [accepted, setAccepted] = useState(false);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(243,93,102,0.16),_transparent_35%),linear-gradient(180deg,#fffaf4_0%,#fff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">Wi-Fi da loja</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Cadastre-se para liberar a internet</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Este fluxo será ligado ao portal cativo da loja. O cliente escaneia o QR Code, preenche o cadastro no PWA e recebe acesso à internet.
          </p>

          <div className="mt-6 rounded-[1.75rem] border border-dashed border-rose-200 bg-rose-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">QR Code da loja</p>
            <div className="mt-4 grid h-56 place-items-center rounded-[1.5rem] bg-white p-4 shadow-inner">
              <div className="grid grid-cols-7 gap-1 rounded-2xl bg-slate-950 p-4">
                {Array.from({ length: 49 }).map((_, index) => (
                  <span
                    key={index}
                    className={`h-3 w-3 rounded-[3px] ${index % 2 === 0 || index % 7 === 0 ? 'bg-white' : 'bg-rose-300'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-950/5 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">Cadastro rápido</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Dados mínimos para liberar o acesso</h2>
          <div className="mt-6 grid gap-4">
            <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <span className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Nome</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Seu nome completo"
                className="mt-1 w-full bg-transparent text-base font-medium text-slate-950 outline-none placeholder:text-slate-400"
              />
            </label>
            <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <span className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Telefone</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="(81) 99999-9999"
                className="mt-1 w-full bg-transparent text-base font-medium text-slate-950 outline-none placeholder:text-slate-400"
              />
            </label>
            <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <span className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">E-mail</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@email.com"
                className="mt-1 w-full bg-transparent text-base font-medium text-slate-950 outline-none placeholder:text-slate-400"
              />
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500"
              />
              <span className="text-sm leading-6 text-slate-600">
                Aceito os termos de uso, a política de privacidade e o tratamento dos meus dados para liberar a internet da loja.
              </span>
            </label>
          </div>

          <button
            className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!name || !phone || !email || !accepted}
          >
            Liberar Wi-Fi
          </button>

          <div className="mt-5 rounded-3xl bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Depois do cadastro</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              <li>• A loja valida o dispositivo e libera o acesso.</li>
              <li>• O cliente pode seguir para o pedido sem novo cadastro.</li>
              <li>• O mesmo fluxo fica pronto para futuras lojas da rede.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
