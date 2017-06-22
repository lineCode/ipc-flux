# electron-process-comms
an ipc based electron process communication interface

[![npm](https://img.shields.io/npm/v/electron-process-comms.svg?style=flat-square)](https://www.npmjs.com/package/electron-process-comms)
[![npm](https://img.shields.io/npm/dt/electron-process-comms.svg?style=flat-square)](https://www.npmjs.com/package/electron-process-comms)

### installation
```bash
$ npm i electron-process-comms
```

## Docs

### import
```js
import ProcessComms from 'electron-process-comms';
```

or

```js
const ProcessComms = require('electron-process-comms');
```

### Creating Actions

> You can duplicate this in both the main and renderer processes

```js
let processComms = new ProcessComms({
	actions: {
		init: () => {
			console.log('hello')
		},
		init2: ({ dispatch }) => {
			dispatch('init')
		},
		init3: ({ dispatch, dispatchExternal }, payload) => {
			console.log(payload)
			return 'init3'
		}
	}
})
```

### Dispatching Actions in the Local Process

local dispatch

```js
processComms.dispatch('init')
```

### Dispatching Actions in the External Process

```js
processComms.dispatchExternal('init')
```

### Dispatching with Payloads

```js
processComms.dispatch('init', PAYLOAD).then((data) => {
	console.log(data) // returned from `init`
})
```

### Accessing Data Returned

Each dispatch returns an instance of a promise.

```js
processComms.dispatch('init').then((data) => {
	console.log(data) // returned from `init`
})
```

This also works for external dispatchers

```js
processComms.dispatchExternal('init').then((data) => {
	console.log(data) // returned from `init`
})
```

### Example

```js
import ProcessComms from 'electron-process-comms';

const processComms = new ProcessComms({
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

processComms.dispatch('action1');

processComms.dispatch('action2').then((data) => {
	console.log(data);
});
```