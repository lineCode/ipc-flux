# electron-process-comms
## Docs

### Install
```bash
npm install electron-process-comms
```

or

```bash
yarn add electron-process-comms
```

### Import
```js
import ProcessComms from 'electron-process-comms';
```

or

```js
const ProcessComms = require('electron-process-comms');
```

### Create actions

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
		}
	}
})
```

### Dispatching

local dispatch

```js
processComms.dispatch('init')
```

other process dispatch

```js
processComms.dispatchExternal('init')
```