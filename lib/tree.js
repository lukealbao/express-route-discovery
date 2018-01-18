'use strict';

const Route = require('./route');
const {normalize} = require('path');

function RouteTree (input) {  
  if (input._router) {
    // user input is an express app
    this._root = input._router.stack;
  } else if (input.stack) {
    // user input is a router
    this._root = input.stack;
  } else {
    throw new TypeError(`input must be an express app or router`);
  }
  
  this._routes = this.buildTree(this._root);
}

// -- Private --
// Traverse an Express Router's stack in depth-first fashion to build a list of
// routes, each with its own stack of middleware layers. Note, the stack
// itself belongs to the Route; each layer may be referenced by many other
// Routes' respective stacks.
RouteTree.prototype.buildTree = function buildTree(input, prefix='', branch=[], output=[]) {
  if (input.length < 1) { return output; }

  const layer = input[0];

  // If some layer doesn't have any nested handlers, then it must provide some
  // middleware handler that is used in downstream routes. The current branch
  // will contain all such handlers.
  if (typeof layer.handle === 'function' && !layer.handle.stack && !layer.route) {
    branch.push(layer);
  }

  if (layer.params) {
    for (const param in layer.params) {
      branch.push(layer.params[param]);
    }
  }

  // If a user has monted middleware via the Router.params method, it will
  // not be a Layer instance, nor will it be in the expected location. Still,
  // we'd like to add it to our stack, along with the necessary interface for
  // private usage (i.e., handle pointing to the function, along with name).
  const branchParams = [];
  if (layer.handle.params) {    
    for (const param in layer.handle.params) {
      for (const handler of layer.handle.params[param]) {
        branchParams.push({
          handle: handler,
          name: handler.name || '<anonymous>',
          regexp: layer.regexp          
        });
      }
    }
  }

  // If some layer has a stack of handlers itself -- i.e., it is an instance
  // of an Express Router -- then we want to take the current branch of
  // middleware and traverse that router. We slice the branch first so that
  // when the nested router(s) add to it, it does not overwrite the current
  // level.
  if (Array.isArray(layer.handle.stack)) {
    // This is ugly, but it's just the way that Express seems to work. Since
    // routers do not retain any reference to the string path that was used
    // to create them (instead only using the regexp), we have to do some
    // crude munging to concatenate the route's "actual" path.
    const routerPrefix = normalize(
      prefix
        + layer.regexp.source
        .replace(/\\/g, '')
        .replace(/\?\(\?=\/\|\$\)/g, '')
        .replace(/\^/g, '')
    );
    
    output = this.buildTree(
      layer.handle.stack, routerPrefix, branch.concat(branchParams), output
    );
  }

  // If some layer contains a route, we are essentially at a leaf node. The
  // route's stack will contain any handlers that were added, identifying them
  // by their relevant methods. If we take the middleware branch up until this
  // point and add the route's stack, we have all relevant handlers (except any
  // fallthrough global error handlers).
  if (layer.route) {
    const methods = Object.keys(layer.route.methods)
          .filter(x => layer.route.methods[x])
          .map(x => x.toUpperCase());    
    const url = normalize(prefix + layer.route.path);
    
    for (const method of methods) {
      output.push(new Route({
        method: method,
        path: url,
        id: `${method}${url}`.replace(/\W/g, '').toLowerCase(),
        stack: branch.concat(
          layer.route.stack.filter(h => h.method.toUpperCase() === method)
        )
      }));
    }
  }

  // With all the above side effects taken care of, let's traverse the rest
  // of the current level's stack with the current branch.
  return this.buildTree(input.slice(1), prefix, branch, output);
};

// -- Public --
// Return an Route given by some identifier. Identifier may be a string, in
// which case it will need to be an exact match for the target route's id
// (e.g., 'POST /api/v1/users'). Alternatively, it can be a regular expression,
// which will be used to find an route's id.
//
// Returns Route or Undefined
RouteTree.prototype.find = function findRoute(identifier, debug=() => {}) {
  const tree = this._routes;
  
  if (typeof identifier === 'string') {
    return tree.find(x => x.id === identifier);
  } else {
    return tree.find(x => identifier.test(x.id));
  }
};

// -- Public --
// (String | RegExp) => Route[]
RouteTree.prototype.findAll = function findAllRoutes(identifier, debug=() => {}) {
  const tree = this._routes;
  
  if (typeof identifier === 'string') {
    return tree.filter(x => x.id === identifier);
  } else {
    return tree.filter(x => identifier.test(x.id));
  }
};

// -- Private --
// Used for printing on the console
RouteTree.prototype.inspect = function() {
  const routes = this._routes.map(x => `  ${x.method} ${x.path}`).join('\n');
  return `ExpressStack[
${routes}
]`;
};

// -- Private --
RouteTree.prototype.toJSON = function () {
  // Relies on the Route class properly implementing its toJSON method.
  return this._routes;
};

module.exports = RouteTree;
