import { contextBridge } from 'electron';
import { resolveDesktopRuntime } from './runtime';

contextBridge.exposeInMainWorld('bakkiDesktop', {
  runtime: resolveDesktopRuntime(),
});
