import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { sair, type Sessao } from '../services/authService';
import { alternarTema, obterTema } from '../services/themeService';
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
  const [tema, setTema] = useState(obterTema);

  function handleSair() {
    sair();
    navigate('/login', { replace: true });
  }

  function handleAlternarTema() {
    setTema(alternarTema());
  }

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-900">
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-6 dark:border-gray-800">
        <Logo className="h-11 w-11 shrink-0" />
        <span className="text-lg font-bold leading-tight text-gray-900 dark:text-gray-100">{EMPRESA.nome}</span>
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
                  isActive
                    ? 'bg-brand-light text-brand dark:bg-brand/20 dark:text-green-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`
              }
            >
              <Icone className="h-5 w-5 shrink-0" aria-hidden="true" />
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 px-3 py-4 dark:border-gray-800">
        <button
          type="button"
          onClick={handleAlternarTema}
          className="mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          {tema === 'escuro' ? (
            <Sun className="h-5 w-5 shrink-0" aria-hidden="true" />
          ) : (
            <Moon className="h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          {tema === 'escuro' ? 'Modo claro' : 'Modo escuro'}
        </button>
        <div className="mb-2 px-2 text-xs text-gray-500 dark:text-gray-400">
          Conectado como <span className="font-medium text-gray-700 dark:text-gray-300">{sessao.nome}</span>
        </div>
        <button
          type="button"
          onClick={handleSair}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
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
      <header className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900 sm:hidden">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{EMPRESA.nome}</span>
        </div>
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          className="text-gray-600 dark:text-gray-300"
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
      </header>

      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 sm:block">
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
          <div className="absolute inset-y-0 left-0 w-72 max-w-[80vw] bg-white shadow-xl dark:bg-gray-900">
            <div className="flex justify-end px-3 pt-3">
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar menu"
                className="text-gray-500 dark:text-gray-400"
              >
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
