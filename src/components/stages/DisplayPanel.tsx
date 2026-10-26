import { Panel } from '../ui/Panel'
import { Scope } from '../ui/Scope'
import { Spectrum } from '../ui/Spectrum'

export function DisplayPanel({ className = '' }: { className?: string }) {
  return (
    <Panel title="Scope / Spectrum" index="05" className={className} bodyClassName="flex flex-col gap-3 short:gap-2">
      <div className="min-h-[88px] flex-[1.3] border border-line short:min-h-[68px]">
        <Scope />
      </div>
      <div className="min-h-[72px] flex-1 short:min-h-[56px]">
        <Spectrum />
      </div>
    </Panel>
  )
}
