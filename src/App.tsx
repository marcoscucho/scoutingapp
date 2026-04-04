import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import ExternalScoutingPage from '@/pages/ExternalScoutingPage'
import InternalScoutingPage from '@/pages/InternalScoutingPage'
import ArmadoEquiposPage from '@/pages/ArmadoEquiposPage'
import MonitoringPage from '@/pages/MonitoringPage'
import PlayerDetailPage from '@/pages/PlayerDetailPage'
import ComparisonPage from '@/pages/ComparisonPage'
import FormationPage from '@/pages/FormationPage'
import SimilarPlayersPage from '@/pages/SimilarPlayersPage'
import OpportunitiesPage from '@/pages/OpportunitiesPage'
import ScatterChartPage from '@/pages/ScatterChartPage'
import ScoutEvaluationPage from '@/pages/ScoutEvaluationPage'
import EvaluationsAdminPage from '@/pages/EvaluationsAdminPage'
import RadarAnalysisPage from '@/pages/RadarAnalysisPage'
import EquipoPage from '@/pages/EquipoPage'
import DashboardPage from '@/pages/DashboardPage'
import CalendarPage from '@/pages/CalendarPage'
import { PDFBuilderProvider } from '@/context/PDFBuilderContext'
import PDFBuilderModal from '@/components/pdf/PDFBuilderModal'
import { PDFAddedToast } from '@/components/pdf/AddToReportButton'

export default function App() {
  return (
    <PDFBuilderProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/scouting" element={<ExternalScoutingPage />} />
            <Route path="/plantel" element={<InternalScoutingPage />} />
            <Route path="/seguimiento" element={<MonitoringPage />} />
            <Route path="/oportunidades" element={<OpportunitiesPage />} />
            <Route path="/similares" element={<SimilarPlayersPage />} />
            <Route path="/jugador/:id" element={<PlayerDetailPage />} />
            <Route path="/comparacion" element={<ComparisonPage />} />
            <Route path="/formacion" element={<FormationPage />} />
            <Route path="/dispersion" element={<ScatterChartPage />} />
            <Route path="/evaluar" element={<ScoutEvaluationPage />} />
            <Route path="/evaluaciones" element={<EvaluationsAdminPage />} />
            <Route path="/radar" element={<RadarAnalysisPage />} />
            <Route path="/analisis" element={<EquipoPage />} />
            <Route path="/calendario" element={<CalendarPage />} />
            <Route path="/inferiores/equipos" element={<ArmadoEquiposPage />} />
          </Route>
        </Routes>
        <PDFBuilderModal />
        <PDFAddedToast />
      </BrowserRouter>
    </PDFBuilderProvider>
  )
}
