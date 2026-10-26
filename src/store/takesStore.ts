import { create } from 'zustand'
import { engine } from '../audio/AudioEngine'
import type { RecordedTake } from '../audio/Recorder'
import { revokeTakeUrl } from '../utils/wav'

interface TakesStore {
  takes: RecordedTake[]
  remove(id: string): void
}

export const useTakesStore = create<TakesStore>((set, get) => ({
  takes: [],
  remove: (id) => {
    const take = get().takes.find((t) => t.id === id)
    if (take) revokeTakeUrl(take)
    set((s) => ({ takes: s.takes.filter((t) => t.id !== id) }))
  },
}))

engine.subscribe((e) => {
  if (e.type === 'take') useTakesStore.setState((s) => ({ takes: [e.take, ...s.takes] }))
})
