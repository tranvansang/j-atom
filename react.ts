import {useState, useSyncExternalStore} from 'react'
import type {Atom} from './index'

export function useAtom<T>(atom: Atom<T>) {
	// useSyncExternalStore requires getServerSnapshot to return the same value
	const [value] = useState(atom.value)
	return useSyncExternalStore(atom.sub, () => atom.value, () => value)
}

