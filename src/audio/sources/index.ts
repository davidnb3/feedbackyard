import type { SourceDef } from '../types'
import { exciterDef } from './ExciterSource'
import { noiseDef } from './NoiseSource'
import { oscillatorDef } from './OscillatorSource'
import { wanderingOscDef } from './WanderingOscSource'

/**
 * The source selector reads from this list. Adding a source (a file player, a microphone input)
 * means one new class and one entry here. See .cursor/rules/adding-a-source.mdc.
 */
export const SOURCE_REGISTRY: readonly SourceDef[] = [oscillatorDef, noiseDef, wanderingOscDef, exciterDef]
