import { useState } from 'react';
export function usePrevious<Value>(value: Value) {
  const [snapshot, setSnapshot] = useState<{ current: Value; previous?: Value }>(() => ({ current: value }));
  if (!Object.is(value, snapshot.current)) setSnapshot({ current: value, previous: snapshot.current });
  return snapshot.previous;
}
