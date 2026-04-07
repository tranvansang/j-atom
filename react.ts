import {useCallback, useState, useSyncExternalStore} from 'react'
import type {Atom} from './index.js'

export function useAtom<T>(atom: Atom<T>) {
	// useSyncExternalStore requires getServerSnapshot returning the same value
	const [value] = useState(atom.value)
	const subscribe = useCallback(
		(cb: () => void) => {
			const sub = atom.sub(cb)
			return () => sub[Symbol.dispose]()
		},
		[atom],
	)
	return useSyncExternalStore(
		subscribe,
		() => atom.value,
		() => value,
	)
}
