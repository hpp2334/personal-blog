/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./inputs/createServer.js":
/*!********************************!*\
  !*** ./inputs/createServer.js ***!
  \********************************/
/***/ ((module) => {

function createServer() {
  return null;
}

module.exports = {
  createServer,
}

/***/ }),

/***/ "./inputs/util.js":
/*!************************!*\
  !*** ./inputs/util.js ***!
  \************************/
/***/ ((module) => {

function test() {
  if (IN_DEV) {
    console.log('in "in dev"');
  }

  if (NOT_IN_DEV) {
    console.log('in "not in dev"');
  } else {
    console.log('in else "not in dev"');
  }

  console.log('out of IN_DEV');
}

module.exports = {
  test,
};


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!*************************!*\
  !*** ./inputs/index.js ***!
  \*************************/
const { test } = __webpack_require__(/*! ./util */ "./inputs/util.js");
const { createServer } = __webpack_require__(/*! ./createServer */ "./inputs/createServer.js");

function main() {
  createServer();
  test();
}

})();

/******/ })()
;