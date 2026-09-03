import { useState, type ReactNode } from 'react';
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Consulta from './pages/Consulta';
import Importacao from './pages/Importacao';
import Historico from './pages/Historico';
import BatchGenerator from './components/BatchGenerator';
import Logo from './components/Logo';
import { EMPRESA } from './services/api';

const LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/consulta', label: 'Consultar Entrega', end: false },
  { to: '/importacao', label: 'Importar Planilha', end: false },
  { to: '/lote', label: 'Recibos Preparados', end: false },
  { to: '/historico', label: 'Histórico', end: false },
];

function Layout({ children }: { children: ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="no-print sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6" />
            <span className="text-sm font-semibold text-gray-900">{EMPRESA.nome}</span>
          </div>

          <nav className="hidden gap-1 sm:flex" aria-label="Navegação principal">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-brand-light text-brand' : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            className="text-gray-600 sm:hidden"
            onClick={() => setMenuAberto((v) => !v)}
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuAberto}
          >
            {menuAberto ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>

        {menuAberto && (
          <nav
            className="flex flex-col gap-1 border-t border-gray-100 px-4 py-2 sm:hidden"
            aria-label="Navegação principal (mobile)"
          >
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMenuAberto(false)}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-brand-light text-brand' : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <Dashboard />
            </Layout>
          }
        />
        <Route
          path="/consulta"
          element={
            <Layout>
              <Consulta />
            </Layout>
          }
        />
        <Route
          path="/importacao"
          element={
            <Layout>
              <Importacao />
            </Layout>
          }
        />
        <Route
          path="/lote"
          element={
            <Layout>
              <BatchGenerator />
            </Layout>
          }
        />
        <Route
          path="/historico"
          element={
            <Layout>
              <Historico />
            </Layout>
          }
        />
      </Routes>
    </HashRouter>
  );
}
