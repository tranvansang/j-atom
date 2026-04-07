import {describe, test, mock} from 'node:test'
import {strictEqual, deepStrictEqual, throws} from 'node:assert/strict'
// @ts-ignore
import {makeAtom} from './index.ts'

describe('makeAtom', () => {
	test('creates atom with initial value', () => {
		const atom = makeAtom(42)
		strictEqual(atom.value, 42)

		const stringAtom = makeAtom('hello')
		strictEqual(stringAtom.value, 'hello')

		const objAtom = makeAtom({foo: 'bar'})
		deepStrictEqual(objAtom.value, {foo: 'bar'})
	})

	test('creates atom without initial value', () => {
		const atom = makeAtom()
		strictEqual(atom.value, undefined)
	})

	test('get and set value', () => {
		const atom = makeAtom(10)
		strictEqual(atom.value, 10)

		atom.value = 20
		strictEqual(atom.value, 20)

		atom.value = 30
		strictEqual(atom.value, 30)
	})

	test('subscribers are notified on value change', () => {
		const atom = makeAtom('initial')
		const subscriber = mock.fn()

		atom.sub(subscriber, {defer: true})

		atom.value = 'updated'
		strictEqual(subscriber.mock.callCount(), 1)
		deepStrictEqual(subscriber.mock.calls[0].arguments, ['updated', 'initial'])

		atom.value = 'another'
		strictEqual(subscriber.mock.callCount(), 2)
		deepStrictEqual(subscriber.mock.calls[1].arguments, ['another', 'updated'])
	})

	test('multiple subscribers are all notified', () => {
		const atom = makeAtom(0)
		const sub1 = mock.fn()
		const sub2 = mock.fn()
		const sub3 = mock.fn()

		atom.sub(sub1, {defer: true})
		atom.sub(sub2, {defer: true})
		atom.sub(sub3, {defer: true})

		atom.value = 1

		deepStrictEqual(sub1.mock.calls[0].arguments, [1, 0])
		deepStrictEqual(sub2.mock.calls[0].arguments, [1, 0])
		deepStrictEqual(sub3.mock.calls[0].arguments, [1, 0])
	})

	test('unsubscribe function works', () => {
		const atom = makeAtom('test')
		const subscriber = mock.fn()

		const sub = atom.sub(subscriber, {defer: true})

		atom.value = 'first'
		strictEqual(subscriber.mock.callCount(), 1)

		sub[Symbol.dispose]()

		atom.value = 'second'
		strictEqual(subscriber.mock.callCount(), 1) // Not called again
	})

	test('subscriber is called immediately by default', () => {
		const atom = makeAtom(100)
		const subscriber = mock.fn()

		atom.sub(subscriber)

		// Should be called immediately with current value
		strictEqual(subscriber.mock.callCount(), 1)
		deepStrictEqual(subscriber.mock.calls[0].arguments, [100, undefined])

		atom.value = 200
		strictEqual(subscriber.mock.callCount(), 2)
		deepStrictEqual(subscriber.mock.calls[1].arguments, [200, 100])
	})

	test('subscriber with defer option', () => {
		const atom = makeAtom(100)
		const subscriber = mock.fn()

		atom.sub(subscriber, {defer: true})

		// Should NOT be called immediately
		strictEqual(subscriber.mock.callCount(), 0)

		atom.value = 200
		strictEqual(subscriber.mock.callCount(), 1)
		deepStrictEqual(subscriber.mock.calls[0].arguments, [200, 100])
	})

	test('subscriber with skip option', () => {
		const atom = makeAtom(0)
		const subscriber = mock.fn()

		// Skip even numbers
		atom.sub(subscriber, {defer: true, skip: newVal => newVal % 2 === 0})

		atom.value = 2
		strictEqual(subscriber.mock.callCount(), 0) // Skipped

		atom.value = 3
		strictEqual(subscriber.mock.callCount(), 1)
		deepStrictEqual(subscriber.mock.calls[0].arguments, [3, 2])

		atom.value = 4
		strictEqual(subscriber.mock.callCount(), 1) // Skipped

		atom.value = 5
		strictEqual(subscriber.mock.callCount(), 2)
		deepStrictEqual(subscriber.mock.calls[1].arguments, [5, 4])
	})

	test('subscriber with both immediate call and skip options', () => {
		const atom = makeAtom(10)
		const subscriber = mock.fn()

		// Skip values less than 15
		atom.sub(subscriber, {
			skip: newVal => newVal < 15,
		})

		// Initial call is skipped because 10 < 15
		strictEqual(subscriber.mock.callCount(), 0)

		atom.value = 12
		strictEqual(subscriber.mock.callCount(), 0) // Skipped

		atom.value = 15
		strictEqual(subscriber.mock.callCount(), 1)
		deepStrictEqual(subscriber.mock.calls[0].arguments, [15, 12])

		atom.value = 20
		strictEqual(subscriber.mock.callCount(), 2)
		deepStrictEqual(subscriber.mock.calls[1].arguments, [20, 15])
	})

	test('subscriber returning cleanup function', () => {
		const atom = makeAtom('initial')
		const cleanup = mock.fn()
		const subscriber = mock.fn(() => ({[Symbol.dispose]: cleanup}))

		atom.sub(subscriber, {defer: true})

		atom.value = 'first'
		strictEqual(subscriber.mock.callCount(), 1)
		strictEqual(cleanup.mock.callCount(), 0)

		atom.value = 'second'
		strictEqual(subscriber.mock.callCount(), 2)
		strictEqual(cleanup.mock.callCount(), 1) // Cleanup from first call

		atom.value = 'third'
		strictEqual(subscriber.mock.callCount(), 3)
		strictEqual(cleanup.mock.callCount(), 2) // Cleanup from second call
	})

	test('cleanup function called on unsubscribe', () => {
		const atom = makeAtom(0)
		const cleanup = mock.fn()
		const subscriber = mock.fn(() => ({[Symbol.dispose]: cleanup}))

		const sub = atom.sub(subscriber, {defer: true})

		atom.value = 1
		strictEqual(cleanup.mock.callCount(), 0)

		sub[Symbol.dispose]()
		strictEqual(cleanup.mock.callCount(), 1)

		// No more cleanups after unsubscribe
		atom.value = 2
		strictEqual(cleanup.mock.callCount(), 1)
	})

	test('setting same reference multiple times', () => {
		const atom = makeAtom({count: 0})
		const subscriber = mock.fn()

		atom.sub(subscriber, {defer: true})

		const obj = {count: 1}
		atom.value = obj
		strictEqual(subscriber.mock.callCount(), 1)

		// Setting same reference again still notifies
		atom.value = obj
		strictEqual(subscriber.mock.callCount(), 2)
		deepStrictEqual(subscriber.mock.calls[1].arguments, [obj, obj])
	})

	test('handles null and undefined values', () => {
		const atom = makeAtom<string | null | undefined>('initial')
		const subscriber = mock.fn()

		atom.sub(subscriber, {defer: true})

		atom.value = null
		deepStrictEqual(subscriber.mock.calls[0].arguments, [null, 'initial'])
		strictEqual(atom.value, null)

		atom.value = undefined
		deepStrictEqual(subscriber.mock.calls[1].arguments, [undefined, null])
		strictEqual(atom.value, undefined)

		atom.value = 'defined'
		deepStrictEqual(subscriber.mock.calls[2].arguments, ['defined', undefined])
		strictEqual(atom.value, 'defined')
	})

	test('subscribers are called in order of subscription', () => {
		const atom = makeAtom(0)
		const callOrder: number[] = []

		atom.sub(
			() => {
				callOrder.push(1)
			},
			{defer: true},
		)
		atom.sub(
			() => {
				callOrder.push(2)
			},
			{defer: true},
		)
		atom.sub(
			() => {
				callOrder.push(3)
			},
			{defer: true},
		)

		atom.value = 1

		deepStrictEqual(callOrder, [1, 2, 3])
	})

	test('subscriber can safely modify atom value', () => {
		const atom = makeAtom(0)
		let callCount = 0
		const subscriber1 = mock.fn((newVal: number) => {
			callCount++
			// Only trigger cascade on first call to avoid infinite loop
			if (newVal === 1 && callCount === 1) {
				atom.value = 2
			}
		})
		const subscriber2 = mock.fn()

		atom.sub(subscriber1, {defer: true})
		atom.sub(subscriber2, {defer: true})

		atom.value = 1

		// Actual behavior based on testing:
		// 1. subscriber1 is called with (1, 0) and sets value to 2
		// 2. This triggers a nested iteration:
		//    - subscriber1 is called with (2, 1)
		//    - subscriber2 is called with (2, 1)
		// 3. Original iteration continues:
		//    - subscriber2 is called with (1, 0)

		strictEqual(subscriber1.mock.callCount(), 2)
		// Node's mock records calls after impl returns, so nested call appears first
		deepStrictEqual(subscriber1.mock.calls[0].arguments, [2, 1])
		deepStrictEqual(subscriber1.mock.calls[1].arguments, [1, 0])

		strictEqual(subscriber2.mock.callCount(), 2)
		deepStrictEqual(subscriber2.mock.calls[0].arguments, [2, 1]) // From nested iteration
		deepStrictEqual(subscriber2.mock.calls[1].arguments, [1, 0]) // From original iteration

		strictEqual(atom.value, 2)
	})

	test('subscriber can unsubscribe itself', () => {
		const atom = makeAtom(0)
		let sub: Disposable | null = null

		const subscriber = mock.fn(() => {
			if (atom.value === 2 && sub) {
				sub[Symbol.dispose]()
			}
		})

		sub = atom.sub(subscriber, {defer: true})

		atom.value = 1
		strictEqual(subscriber.mock.callCount(), 1)

		atom.value = 2
		strictEqual(subscriber.mock.callCount(), 2)

		// Should have unsubscribed itself
		atom.value = 3
		strictEqual(subscriber.mock.callCount(), 2) // Not called again
	})

	test('subscriber errors propagate and stop further subscribers', () => {
		const atom = makeAtom('test')
		const sub1 = mock.fn()
		const sub2 = mock.fn(() => {
			throw new Error('Subscriber error')
		})
		const sub3 = mock.fn()

		atom.sub(sub1, {defer: true})
		atom.sub(sub2, {defer: true})
		atom.sub(sub3, {defer: true})

		// The error will propagate and stop iteration
		throws(
			() => {
				atom.value = 'updated'
			},
			{message: 'Subscriber error'},
		)

		// sub1 is called before the error
		deepStrictEqual(sub1.mock.calls[0].arguments, ['updated', 'test'])
		// sub2 throws the error
		deepStrictEqual(sub2.mock.calls[0].arguments, ['updated', 'test'])
		// sub3 is not called because sub2 threw
		strictEqual(sub3.mock.callCount(), 0)

		// The value is still updated though
		strictEqual(atom.value, 'updated')
	})

	test('skip function receives both old and new values', () => {
		const atom = makeAtom(10)
		const subscriber = mock.fn()
		const skipFn = mock.fn((newVal: number, oldVal: number) => {
			// Skip if increase is less than 5
			return newVal - oldVal < 5
		})

		atom.sub(subscriber, {defer: true, skip: skipFn})

		atom.value = 12
		deepStrictEqual(skipFn.mock.calls[0].arguments, [12, 10])
		strictEqual(subscriber.mock.callCount(), 0) // Skipped (increase of 2)

		atom.value = 17
		deepStrictEqual(skipFn.mock.calls[1].arguments, [17, 12])
		strictEqual(subscriber.mock.callCount(), 1) // Not skipped (increase of 5)
		deepStrictEqual(subscriber.mock.calls[0].arguments, [17, 12])

		atom.value = 18
		deepStrictEqual(skipFn.mock.calls[2].arguments, [18, 17])
		strictEqual(subscriber.mock.callCount(), 1) // Skipped (increase of 1)
	})

	test('different atoms are independent', () => {
		const atom1 = makeAtom('a')
		const atom2 = makeAtom('b')

		const sub1 = mock.fn()
		const sub2 = mock.fn()

		atom1.sub(sub1, {defer: true})
		atom2.sub(sub2, {defer: true})

		atom1.value = 'a-updated'
		deepStrictEqual(sub1.mock.calls[0].arguments, ['a-updated', 'a'])
		strictEqual(sub2.mock.callCount(), 0)

		atom2.value = 'b-updated'
		strictEqual(sub1.mock.callCount(), 1)
		deepStrictEqual(sub2.mock.calls[0].arguments, ['b-updated', 'b'])
	})

	test('atom value can be complex objects', () => {
		const atom = makeAtom({
			users: [{id: 1, name: 'Alice'}],
			settings: {theme: 'dark'},
		})

		const subscriber = mock.fn()
		atom.sub(subscriber, {defer: true})

		const newValue = {
			users: [
				{id: 1, name: 'Alice'},
				{id: 2, name: 'Bob'},
			],
			settings: {theme: 'light'},
		}

		atom.value = newValue

		deepStrictEqual(subscriber.mock.calls[0].arguments, [
			newValue,
			{
				users: [{id: 1, name: 'Alice'}],
				settings: {theme: 'dark'},
			},
		])
		strictEqual(atom.value, newValue)
	})
})
