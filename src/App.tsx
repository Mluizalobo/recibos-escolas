import { type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Building2, FileClock, LayoutDashboard, Layers, School, Search, TrendingUp, UploadCloud } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Consulta from './pages/Consulta';
import Importacao from './pages/Importacao';
import Historico from './pages/Historico';
import DadosEmpresa from './pages/DadosEmpresa';
import RelatorioSemanal from './pages/RelatorioSemanal';
import EscolasCadastradas from './pages/EscolasCadastradas';
import Login from './pages/Login';
import BatchGenerator from './components/BatchGenerator';
import Sidebar, { type LinkSidebar } from './components/Sidebar';
import { obterSessao } from './services/authService';

const LINKS: LinkSidebar[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/consulta', label: 'Consultar Entrega', icon: Search },
  { to: '/importacao', label: 'Importar Planilha', icon: UploadCloud },
  { to: '/lote', label: 'Recibos Preparados', icon: Layers },
  { to: '/escolas', label: 'Escolas Cadastradas', icon: School },
  { to: '/historico', label: 'Histórico', icon: FileClock },
  { to: '/relatorio', label: 'Relatório Semanal', icon: TrendingUp },
  { to: '/empresa', label: 'Dados da Empresa', icon: Building2 },
];

function RotaProtegida({ children }: { children: ReactNode }) {
  const location = useLocation();
  const sessao = obterSessao();

  if (!sessao) {
    return <Navigate to="/login" state={{ de: location.pathname }} replace />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar links={LINKS} sessao={sessao} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RotaProtegida>
              <Dashboard />
            </RotaProtegida>
          }
        />
        <Route
          path="/consulta"
          element={
            <RotaProtegida>
              <Consulta />
            </RotaProtegida>
          }
        />
        <Route
          path="/importacao"
          element={
            <RotaProtegida>
              <Importacao />
            </RotaProtegida>
          }
        />
        <Route
          path="/lote"
          element={
            <RotaProtegida>
              <BatchGenerator />
            </RotaProtegida>
          }
        />
        <Route
          path="/escolas"
          element={
            <RotaProtegida>
              <EscolasCadastradas />
            </RotaProtegida>
          }
        />
        <Route
          path="/historico"
          element={
            <RotaProtegida>
              <Historico />
            </RotaProtegida>
          }
        />
        <Route
          path="/empresa"
          element={
            <RotaProtegida>
              <DadosEmpresa />
            </RotaProtegida>
          }
        />
        <Route
          path="/relatorio"
          element={
            <RotaProtegida>
              <RelatorioSemanal />
            </RotaProtegida>
          }
        />
      </Routes>
    </HashRouter>
  );
}
