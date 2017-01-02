LiveScript = require 'livescript'

class Interpreter

  eval: (cmd) ->
    bare = LiveScript.compile cmd, {+bare}
    (e=eval) bare

  stringify: (s) ->
    try
      ""+s
    catch
      JSON.stringify s


window <<< {l: LiveScript, Interpreter}
