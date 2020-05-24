import { createStateDesign } from "../src"
import { state, config, counterConfig } from "./shared"

describe("createStateDesign", () => {
  it("Should create a state.", () => {
    expect(createStateDesign({})).toBeTruthy()
    expect(createStateDesign(config)).toBeTruthy()

    expect(state.stateTree).toBeTruthy()
    expect(state.active).toBeTruthy()
    expect(state.can).toBeTruthy()
    expect(state.whenIn).toBeTruthy()
    expect(state.data).toBeTruthy()
    expect(state.isIn).toBeTruthy()
  })

  // Can I chain events?

  it("Should support chaining with then.", async (done) => {
    const counter = createStateDesign(counterConfig)

    await counter
      .send("TOGGLED")
      .then((c) => c.send("CLICKED_PLUS"))
      .then((c) => c.send("CLICKED_PLUS"))

    expect(counter.data.count).toBe(3)
    done()
  })

  // Does the `isIn` helper work?

  it("Should support the isIn helper.", async (done) => {
    const counter = createStateDesign(counterConfig)
    expect(counter.isIn("active")).toBeFalsy()
    expect(counter.isIn("inactive")).toBeTruthy()
    expect(counter.isIn("active", "inactive")).toBeFalsy()
    expect(counter.isIn("missing")).toBeFalsy()
    done()
  })

  it("Should support the isInAny helper.", async (done) => {
    const counter = createStateDesign(counterConfig)
    expect(counter.isIn("active")).toBeFalsy()
    expect(counter.isIn("inactive")).toBeTruthy()
    expect(counter.isInAny("active", "inactive")).toBeTruthy()
    expect(counter.isInAny("missing")).toBeFalsy()
    done()
  })

  it("Should support the isIn helper with transitions.", async (done) => {
    const counter = createStateDesign(counterConfig)
    expect(counter.isIn("active")).toBeFalsy()
    expect(counter.isIn("inactive")).toBeTruthy()
    await counter.send("TOGGLED")
    expect(counter.isIn("active")).toBeTruthy()
    expect(counter.isIn("inactive")).toBeFalsy()
    done()
  })

  // Does the `can` helper work?

  it("Should support can helper.", async (done) => {
    const counter = createStateDesign(counterConfig)
    expect(counter.can("CLICKED_PLUS")).toBeFalsy()
    expect(counter.can("TOGGLED")).toBeTruthy()
    done()
  })

  it("Should support can helper with transitions.", async (done) => {
    const counter = createStateDesign(counterConfig)
    expect(counter.can("CLICKED_PLUS")).toBeFalsy()
    expect(counter.can("TOGGLED")).toBeTruthy()
    await counter.send("TOGGLED")
    expect(counter.can("CLICKED_PLUS")).toBeTruthy()
    expect(counter.can("TOGGLED")).toBeTruthy()
    done()
  })

  // Do initial active states work?
  it("Should support initial active states.", () => {
    const counter = createStateDesign(counterConfig)
    expect(counter.isIn("inactive")).toBeTruthy()
    expect(counter.isIn("active")).toBeFalsy()
  })

  // Do transitions work?
  // Do down-level activations work?
  // Do onEvent events work?

  it("Should handle transitions.", async (done) => {
    const { stateTree } = state
    const inactiveToInactive = stateTree.states.inactive.on.TOGGLE[0].to
    expect(inactiveToInactive).toBeTruthy()
    expect(inactiveToInactive?.(state.data, undefined, undefined)).toBe(
      "active"
    )

    expect(state.isIn("inactive")).toBeTruthy()

    await state.send("TOGGLE")

    expect(state.isIn("active")).toBeTruthy()
    expect(state.isIn("min")).toBeTruthy()
    expect(state.isIn("mid")).toBeFalsy()
    expect(state.isIn("max")).toBeFalsy()

    await state.send("CLICKED_PLUS")

    expect(state.isIn("min")).toBeFalsy()
    expect(state.isIn("mid")).toBeTruthy()
    expect(state.isIn("max")).toBeFalsy()

    await state.send("TOGGLE")

    expect(state.isIn("inactive")).toBeTruthy()
    expect(state.isIn("min")).toBeFalsy()
    expect(state.isIn("mid")).toBeFalsy()
    expect(state.isIn("max")).toBeFalsy()

    done()
  })

  // Do onEnter / onExit events work?

  // Do onExit events work?

  it("Should support onEnter and onExit events.", async (done) => {
    const counter = createStateDesign(counterConfig)
    expect(counter.data.activations).toBe(0)
    let update = await counter.send("TOGGLED")
    expect(update.data.activations).toBe(1)
    expect(update.data.deactivations).toBe(0)
    expect(counter.isIn("active")).toBeTruthy()
    update = await counter.send("TOGGLED")
    expect(update.data.activations).toBe(1)
    expect(update.data.deactivations).toBe(1)
    done()
  })

  // Does causing a transition prevent further updates?
  it("Should support onEnter and onExit events.", async (done) => {
    const toggler = createStateDesign({
      initial: "inactive",
      data: {
        count: 0,
      },
      states: {
        inactive: {
          on: { TOGGLED: { do: "increment", to: "active" } },
        },
        active: {
          on: { TOGGLED: [{ to: "inactive" }, { do: "increment" }] },
        },
      },
      actions: {
        increment(d) {
          d.count++
        },
      },
    })

    expect(toggler.isIn("inactive")).toBeTruthy()
    let update = await toggler.send("TOGGLED")
    expect(toggler.isIn("active")).toBeTruthy()
    expect(update.data.count).toBe(1)
    update = await toggler.send("TOGGLED")
    expect(toggler.isIn("inactive")).toBeTruthy()
    update = await toggler.send("TOGGLED")
    expect(toggler.isIn("active")).toBeTruthy()
    expect(update.data.count).toBe(2)
    expect(toggler.data.count).toBe(2)
    done()
  })

  // Do asynchronous actions block further updates?

  // Do data mutations work?

  // Do updates work?

  // Do auto events work?

  // Does asynchronous send queueing work?

  // Does WhenIn work?

  // Do else event handlers work?

  // Do initial active states work?
  it("Should support else event handlers.", async (done) => {
    const state = createStateDesign({
      data: { count: 0 },
      on: {
        SOME_EVENT: {
          if: "atMin",
          do: ["incrementByOne", "incrementByOne"],
          else: {
            unless: "atMax",
            do: "incrementByOne",
            else: "reset",
          },
        },
      },
      conditions: {
        atMin: (data) => data.count === 0,
        atMax: (data) => data.count === 5,
      },
      actions: {
        incrementByOne: (data) => data.count++,
        reset: (data) => (data.count = 0),
      },
    })

    expect(state.data.count).toBe(0) // Start at zero
    await state.send("SOME_EVENT")
    expect(state.data.count).toBe(2) // When zero, adds two
    await state.send("SOME_EVENT")
    expect(state.data.count).toBe(3) // When less than max, adds one
    await state.send("SOME_EVENT") // 4
    await state.send("SOME_EVENT") // 5
    await state.send("SOME_EVENT") // When at max, resets to zero
    expect(state.data.count).toBe(0)

    const ugly = createStateDesign({
      data: { count: 0 },
      on: {
        SOME_UGLY_EVENT: {
          if: () => false,
          else: {
            if: () => false,
            else: {
              if: () => false,
              else: {
                if: () => false,
                else: {
                  if: () => false,
                  else: (data) => {
                    data.count = 5
                  },
                },
              },
            },
          },
        },
      },
    })

    expect(ugly.data.count).toBe(0)
    await ugly.send("SOME_UGLY_EVENT")
    expect(ugly.data.count).toBe(5)
    done()
  })

  // Do value types work?
  const stateB = createStateDesign({
    data: { count: 0 },
    values: {
      doubleCount(d) {
        return d.count * 2
      },
      shoutedCount(d) {
        return "Hey, the count is " + d.count
      },
    },
  })

  type IsNumber<T extends number> = T
  type IsString<T extends string> = T

  type A = IsString<typeof stateB.values.shoutedCount>
  type B = IsNumber<typeof stateB.values.doubleCount>

  // @ts-ignore
  type C = A | B
})