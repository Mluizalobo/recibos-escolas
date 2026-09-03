import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { sair, type Sessao } from '../services/authService';
import { EMPRESA } from '../services/api';
import Logo from './Logo';

export interface LinkSidebar {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface SidebarProps {
  links: LinkSidebar[];
  sessao: Sessao;
}

function ConteudoSidebar({ links, sessao, onNavegar }: SidebarProps & { onNavegar?: () => void }) {
  const navigate = useNavigate();

  function handleSair() {
    sair();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-6">
        <Logo className="h-11 w-11 shrink-0" />
        <span className="text-lg font-bold leading-tight text-gray-900">{EMPRESA.nome}</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Navegação principal">
        {links.map((link) => {
          const Icone = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={onNavegar}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-brand-light text-brand' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icone className="h-5 w-5 shrink-0" aria-hidden="true" />
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 px-3 py-4">
        <div className="mb-2 px-2 text-xs text-gray-500">
          Conectado como <span className="font-medium text-gray-700">{sessao.nome}</span>
        </div>
        <button
          type="button"
          onClick={handleSair}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
          Sair
        </button>
      </div>
    </div>
  );
}

/** Barra lateral fixa no desktop; vira menu retrátil (drawer) no mobile. */
export default function Sidebar({ links, sessao }: SidebarProps) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <header className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:hidden">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="text-sm font-bold text-gray-900">{EMPRESA.nome}</span>
        </div>
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          className="text-gray-600"
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
      </header>

      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 border-r border-gray-200 bg-white sm:block">
        <ConteudoSidebar links={links} sessao={sessao} />
      </aside>

      {aberto && (
        <div className="no-print fixed inset-0 z-30 sm:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setAberto(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[80vw] bg-white shadow-xl">
            <div className="flex justify-end px-3 pt-3">
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar menu" className="text-gray-500">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <ConteudoSidebar links={links} sessao={sessao} onNavegar={() => setAberto(false)} />
          </div>
        </div>
      )}
    </>
  );
}
