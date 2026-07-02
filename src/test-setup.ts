/**
 * Marks every test file as a React act environment so `act()` warnings are
 * suppressed and React flushes effects synchronously during tests.
 */
const globalWithAct = globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean };

globalWithAct.IS_REACT_ACT_ENVIRONMENT = true;
