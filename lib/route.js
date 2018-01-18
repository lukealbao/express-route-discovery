"use strict";

// An Route does not exist as a proper object in the Express ecosystem.
// Rather, an Express router will inspect an incoming request's method and
// path in order to traverse its handlers, testing each's regular expression
// matcher, building up a single call chain of middleware functions.
//
// The RouteTree performs a similar traversal, and in doing so, it creates
// these Routes, which are a more intuitive object for inspecting the
// operations of a given route.
//
// An route's stack contains direct pointers to every Layer (an Express
// class) that may handle it. For our purposes, we may consider each Layer
// as having the following shape:
//
// {
//   handle: Some connect-like function
//   name: Usually taken from the name of the handle, or "<anonymous"
// }
//
// The fact that these are direct references to the underlying Layer on the
// Express object has two important related effects:
//
// 1. You may use sinon to stub or otherwise inspect a piece of middleware,
//    even after it has been mounted to the router at runtime, by treating
//    it as a method of the associated Layer.
// 2. Altering a Layer in any way will affect the actual server being
//    inspected. If you forget to restore a stubbed piece of middleware,
//    you could really confuse yourself.

function Route(route) {
  this.id = route.id;
  this.path = route.path;
  this.method = route.method;
  this.stack = route.stack;
}

// -- Public --
// Get a reference to a specific layer, based on its name. Use this
// if you want to use sinon, or run some mounted middleware as a plain
// function, etc. The actual function will be given by the `handle` property
// of the returned value.
Route.prototype.layer = function layer(name) {
  return this.stack.find(x => x.name === name);
};

// -- Public --
// Return a simplified representation of the route's stack, suitable for
// printing, etc., as a list of strings.
Route.prototype.list = function handler() {
  return this.stack.map(layer => layer.name);
};

Route.prototype.inspect =
Route.prototype.toJSON = function() {
  return Object.assign({}, this, { stack: this.stack.map(x => x.name) });
};

module.exports = Route;
