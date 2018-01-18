'use strict';

function timeHandler (fn) {
  function timer (req, res, next) {
    console.error('entry timed', fn.name);
    req.timers = req.timers || [{
      name: '<Enter>',
      start: process.hrtime()
    }];
    
    addTime(req, fn.name);
    

    console.error('calling timed', fn.name);
    return fn(req, res, next);
  }

  Object.defineProperty(timer, 'name', {
    configurable: false,
    enumerable: false,
    value: fn.name
  });

  return timer;
}

function seconds (hrtime) {
  return hrtime[0] + hrtime[1]/1e9;
}

function addTime(req, name) {
  const last = req.timers[req.timers.length-1];
  const now = process.hrtime(last.start);
  
  last.end = seconds(now);
  
  req.timers.push({
    name: name,
    start: now
  });
}

module.exports = timeHandler;
