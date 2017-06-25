# ipc-flux
> Flux like state & action management across electron processes (ipc).

[![Travis](https://img.shields.io/travis/harryparkdotio/ipc-flux.svg?style=flat-square)](https://travis-ci.org/harryparkdotio/ipc-flux/)
[![npm](https://img.shields.io/npm/v/ipc-flux.svg?style=flat-square)](https://www.npmjs.com/package/ipc-flux)
[![npm](https://img.shields.io/npm/dt/ipc-flux.svg?style=flat-square)](https://www.npmjs.com/package/ipc-flux)

### installation
```bash
$ npm i ipc-flux -S
```

## Docs

### import (ES6/ES2015)
```js
import IpcFlux from 'ipc-flux';
```

or, using `require`

```js
const IpcFlux = require('ipc-flux').default;
```

### Defining Actions

> This can be duplicated in both main and renderer processes, ipc-flux accounts for and handles this

```js
const ipcflux = new IpcFlux({
	actions: {
		init: () => {
			console.log('hello');
		},
		init2: ({ dispatch }) => {
			dispatch('init');
		},
		init3: ({ dispatch, dispatchExternal }, payload) => {
			console.log(payload);
			return 'init3';
		}
	}
});
```

or, register actions as required

```js
const ipcFlux = new IpcFlux();

ipcFlux.registerAction('ACTION_NAME', ({ dispatch, dispatchExternal }, payload) => {
	...
});
```

### Dispatching Actions in the Local Process (Main or Renderer)

```js
ipcFlux.dispatch('init');
```

### Dispatching Actions in the External Process (Main)

```js
// NOTE: You must pass in the targetBrowserWindow, or the targetBrowserWindow id
// to dispatch renderer actions from the main process
ipcFlux.dispatchExternal(targetBrowserWindow, 'init');
```

### Dispatching Actions in the External Process (Renderer)

```js
ipcFlux.dispatchExternal('init');
```

### Dispatching with Payloads

```js
ipcFlux.dispatch('init', PAYLOAD);
```

### Accessing Returned Data

Each dispatch returns a promise, because async!

```js
ipcFlux.dispatch('init').then((data) => {
	console.log(data); // returned from `init`
});

ipcFlux.dispatchExternal('init').then((data) => {
	console.log(data); // returned from `init`
});
```

### Config (Main)

```js
const ipcflux = new IpcFlux({
	config: {
		handshake: {
			timeout: 10000 // default [10000]
		}
	}
})

```

### Example

```js
import IpcFlux from 'ipc-flux';

const ipcFlux = new IpcFlux({
	actions: {
		action1: () => {
			return 'action1';
		},
		action2: ({ dispatch }, payload) => {
			console.log(payload);
			return 'action2';
		}
	}
});

ipcFlux.dispatch('action1');

ipcFlux.dispatch('action2').then((data) => {
	console.log(data);
});
```

### Info
#### Used Ipc Channels
- `IpcFlux-Call`
- `IpcFlux-Callback`
- `IpcFlux-Error`
- `IpcFlux-Handshake`
- `IpcFlux-Handshake-Callback`
- `IpcFlux-Handshake-Success`

Please do **not** use the listed Ipc channels as doing so will likely interfere with the functionality of `IpcFlux`