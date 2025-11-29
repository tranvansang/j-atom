# j-atom - Javascript State Management Library

Simple reactive state management.

### Sample Usage

```typescript
import {makeAtom, useAtom} from 'j-atom'
import {useAtom} from 'j-atom/react'

// create atom
const atom = makeAtom<T>()
const atomWithInitial = makeAtom<T>(initialValue) // with initial value

// use atom in React component
const value = useAtom(atom)

// getter and setter
atom.value = newValue // set value synchronously
const currentValue = atom.value // get value synchronously

// subscribe for changes
const unsub = atom.sub((newVal, oldVal) => console.log(newVal, oldVal))
const unsub2 = atom.sub(() => console.log(atom.value))

// subscribe with cleanup
const unsub3 = atom.sub((newVal) => {
  const handler = () => console.log('cleanup')
  window.addEventListener('resize', handler)
  return () => window.removeEventListener('resize', handler)
})

// subscribe and run immediately
const unsub4 = atom.sub((newVal, oldVal) => console.log(newVal, oldVal), {now: true})

// subscribe with conditional updates
const unsub5 = atom.sub(
  (newVal, oldVal) => console.log(newVal),
  {skip(newVal, oldVal) {return newVal === oldVal}} // skip if values are the same
)

unsub() // unsubscribe
```

### API

- `makeAtom<T>(initialValue?: T)`: Creates an atom with optional initial value
- `useAtom(atom: Atom<T>): T`: React hook to subscribe to atom changes
- `atom.value`: Get or set the value synchronously
- `atom.sub(subscriber, options?)`: Subscribe to value changes
	- Returns unsubscribe function
	- Subscriber receives `(newValue, oldValue)` and can return cleanup function
	- Options:
		- `now: boolean` - Call subscriber immediately with current value
		- `skip: (newVal, oldVal) => boolean` - Skip subscriber if returns true
