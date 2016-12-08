
Example:

```javascript
    module: {
      loaders: [{
        test: /ng-module\.json/,
        loader: require.resolve('./ng-module-loader')
      }]
```

use:

```javascript
    // (or: let someModule = require('path/to/ng-module.json'))
    import someModule from './path/to/ng-module.json'

    let app = angular.module('main', [someModule.name])
```

example:

```javascript
    {
        "name": "name.of.module",
        "depends": [
            "ngRoute",
            { "ngModule": "../other/module" }
        ]
    }
```
