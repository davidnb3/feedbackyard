import { AppFrame } from './components/layout/AppFrame'
import { Header } from './components/layout/Header'
import { NoticeBar } from './components/layout/NoticeBar'
import { TransportBar } from './components/layout/TransportBar'
import { DisplayPanel } from './components/stages/DisplayPanel'
import { FxPanel } from './components/stages/FxPanel'
import { LoopPanel } from './components/stages/LoopPanel'
import { MemoryPanel } from './components/stages/MemoryPanel'
import { ModPanel } from './components/stages/ModPanel'
import { OutputPanel } from './components/stages/OutputPanel'
import { RecordPanel } from './components/stages/RecordPanel'
import { SourcePanel } from './components/stages/SourcePanel'

export default function App() {
  return (
    <AppFrame>
      <Header />
      <TransportBar />
      <main className="grid flex-1 grid-cols-12 grid-rows-[auto_236px_158px] gap-3 short:grid-rows-[auto_204px_134px] short:gap-2">
        <SourcePanel className="col-span-4" />
        <LoopPanel className="col-span-5" />
        <ModPanel className="col-span-3" />

        <FxPanel className="col-span-3" />
        <DisplayPanel className="col-span-5" />
        <OutputPanel className="col-span-4" />

        <RecordPanel className="col-span-8" />
        <MemoryPanel className="col-span-4" />
      </main>
      <NoticeBar />
    </AppFrame>
  )
}
