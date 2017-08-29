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

### Options

```js
const ipcFlux = new IpcFlux({
	config: {
		debug: false, // enable/disable debug mode [default: false]
		maxListeners: 50, // maximum ipcMain/ipcRenderer listeners [default: 50]
	}
});
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

### `<webview>`
#### html file

```html
<!-- `nodeintegration` MUST be specified to expose the node api used by ipc-flux -->
<webview src="..." nodeintegration></webview>
```

###### *webview html src*

```html
<script>
	require('./renderer.js');
</script>
```

###### *`renderer.js` src*

```js
import IpcFlux from 'ipc-flux';

const ipcFlux = new IpcFlux({
	actions: {
		action1: ({dispatchExternal}) => {
			dispatchExternal('action3');
		},
		action2: () => {
			console.log('action2');
		}
	}
});

setTimeout(() => {
	ipcFlux.dispatch('action1');
}, 500);
```

#### preload

```html
<!-- src can be *any* url -->
<webview src="..." preload="./renderer.js"></webview>
```

###### *`renderer.js` src*

```js
import IpcFlux from 'ipc-flux';

const ipcFlux = new IpcFlux({
	actions: {
		action1: ({dispatchExternal}) => {
			dispatchExternal('action3');
		},
		action2: () => {
			console.log('action2');
		}
	}
});

setTimeout(() => {
	ipcFlux.dispatch('action1');
}, 500);
```

### Info
#### Used Ipc Channels
- `IpcFlux-Call`
- `IpcFlux-Callback`
- `IpcFlux-Error`

Please do **not** use the listed Ipc channels as doing so will probably interfere with the functionality of `IpcFlux`