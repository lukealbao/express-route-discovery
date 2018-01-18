# Express Route Discovery
If you've ever poked around an Express app, you know that the "routes"
don't exist, except as a discoverable graph of handlers. This package
will build simple data structures of the routes of an app, for the
purposes of inspection, documentation, or testing.

## Discovering your routes
Importing this module gives you the discovery factory. Pass it some
Express app, and it will return a **RouteTree**.

```js
const app = require('express')();
const discover = require('express-route-discovery');

// ... mount all your routes/routers/etc.

app.locals.routes = discover(app);
```

## But why?
There are two main uses for this package: information and testing. 

For **informational** purposes, you may decide you want to mount the
route tree on your `app.locals` (after, of course, all routes have
been mounted). The **RouteTree** and its component **Route**s both
implement a `toJSON` method. So, if you would like to print a list of
your routes and their associated handler stacks, it can be done just
with `JSON.stringify(discover(app))`. **You will definitely want to
name your handler functions.**

Or you may want this for **testing** purposes. If you have a route
tree, you can find a route and its associated layers. What that means
is you can use something like sinon to stub/spy certain middleware
layers as needed. 

**A short performance note:** The factory function runs quickly
enough, but it is also memoized. After calling it once on some app
object, it will return the same tree on subsequent calls (this can be
overridden if you need).

## Data Structures
### RouteTree
A route tree encapsulates all the **Routes** of a given app. It
provides a basic interface for finding Routes.

#### Method: RouteTree.find
- Signature :: `(RegExp | String) => (Route | Undefined)`
- The argument to this function will be matched against the target
  Route's id (e.g., `"getusersfriends"`). If the argument is a string,
  it must be an exact match; if a regular expression, it will return
  the first route whose id matches.

#### Method: RouteTree.findAll
- Signature :: `(RegExp | String) => Array<Route?>`
- The argument **may** be a string, but this is more for finding many
  Routes by some regexp.
  

### Route
A route is a representation of an HTTP endpoint. It can be uniquely
identified by the HTTP method and path (and that is how we identify
them here). Its "value" is an orderered stack of all the connect-based
handlers that have been mounted on its parent routers.

Internally, the objects in this stack are references to
`Express.Layer` objects. (This class is a private one; this package
works for express v4 and above.) Since these references point to the
actual router's layers, please use caution if you want to alter these
objects.

#### Shape: Route
|**Property**|**Description**|
|---------|----------|
|id|A lower-case string of the HTTP method and full path to this route|
|path|e.g., `/api/users/friends`|
|method|The associated HTTP method|
|stack|An array of all the **Layers** that handle this Route|

#### Method: Route.layer
- Signature :: `(String) => (Layer | Undefined)`
- Internally, this simply looks at the route's `stack` and finds the
  appropriate layer.

### Layer
A layer is a direct reference to the `Express.Layer` object for some
piece of middleware. Alter it only with caution.

#### Shape: Layer
There are other properties, which you can inspect in a repl, but these are the important ones:

|**Property**|**Description**|
|---------|----------|
|handle|The actual connect-based function. You could, for example, use sinon to stub `(SomeLayer, 'handle')`|
|name|Taken from the name of the handle|



