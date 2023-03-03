import { useEffect, useState } from "react";

type RecvFn<T> = (data: T) => void;

export interface Sender<T> {
  send: (data: T) => void;
}

export interface ReceiverManager<T> {
  register: (fn: RecvFn<T>) => void;
  unregister: (fn: RecvFn<T>) => void;
}

export function createChannel<T>() {
  const receiveFnSet = new Set<RecvFn<T>>();
  function _notify(data: T) {
    for (const fn of receiveFnSet) {
      fn(data);
    }
  }

  const manager: ReceiverManager<T> = {
    register(fn) {
      receiveFnSet.add(fn);
    },
    unregister(fn) {
      receiveFnSet.delete(fn);
    },
  };
  const sender: Sender<T> = {
    send(data: T) {
      _notify(data);
    },
  };

  return [sender, manager] as const;
}

export function useReceiverWithDefault<T>(
  manager: ReceiverManager<T>,
  defaultValue: T
) {
  const [state, setState] = useState<T>(defaultValue);
  useEffect(() => {
    manager.register(setState);
    return () => {
      manager.unregister(setState);
    };
  }, [manager]);
  return state;
}
