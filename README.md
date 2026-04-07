# j-atom - Javascript State Management Library

Simple reactive state management with [Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management) support.

### Sample Usage

```typescript
import {makeAtom} from 'j-atom'
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
const sub = atom.sub((newVal, oldVal) => console.log(newVal, oldVal))
const sub2 = atom.sub(() => console.log(atom.value))

// subscribe with cleanup (return a Disposable)
const sub3 = atom.sub((newVal) => {
  const handler = () => console.log(newVal)
  window.addEventListener('resize', handler)
  return {[Symbol.dispose]() { window.removeEventListener('resize', handler) }}
})

// nested subscriptions (inner sub is auto-disposed when outer re-fires)
const sub4 = atom1.sub(val1 => atom2.sub(val2 => {
  // do something with val1, val2
}))

// works with any Disposable resource
const sub5 = atom.sub(val => makeMyResource())

// subscribe without running immediately
const sub6 = atom.sub((newVal, oldVal) => console.log(newVal, oldVal), {defer: true})

// subscribe with conditional updates
const sub7 = atom.sub(
  (newVal, oldVal) => console.log(newVal),
  {skip(newVal, oldVal) {return newVal === oldVal}} // skip if values are the same
)

// unsubscribe
sub[Symbol.dispose]()

// or use `using` for block-scoped subscriptions
{
  using sub = atom.sub(val => console.log(val))
  // auto-disposed at end of block
}
```

### API

- `makeAtom<T>(initialValue?: T)`: Creates an atom with optional initial value
- `useAtom(atom: Atom<T>): T`: React hook to subscribe to atom changes
- `atom.value`: Get or set the value synchronously
- `atom.sub(subscriber, options?)`: Subscribe to value changes
	- Returns `Disposable` — call `[Symbol.dispose]()` or use `using` to unsubscribe
	- Subscriber receives `(newValue, oldValue)` and can return a `Disposable` for cleanup
	- Cleanup is called on the next subscriber invocation or on dispose
	- Options:
		- `defer: boolean` - If true, skip the immediate call with current value (default: false)
		- `skip: (newVal, oldVal) => boolean` - Skip subscriber if returns true
