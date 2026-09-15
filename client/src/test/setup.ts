import { afterEach } from 'vitest'
import { cleanup, configure } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Testing Library gives async queries 1s by default, which a loaded CI box can
// blow through while React is simply waiting to be scheduled. Nothing here is
// meant to take seconds, so a higher ceiling only removes false failures.
configure({ asyncUtilTimeout: 5000 })

afterEach(() => {
  cleanup()
})
