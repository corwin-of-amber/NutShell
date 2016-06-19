# Built-in shell commands

require! [fs, path]


realpath = (path_='.') ->
  if path.isAbsolute path_
    path_
  else
    path.join shell.state.cwd, path_

ls = (path) ->
  path = realpath path
  fs.readdirSync path


export realpath, ls
