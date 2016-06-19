      

class Shell
  ->
    @cells = new Notebook
    @state =
      cwd: "/"


Cell::execute = ->
  try
    out = runEval @get 'command'
    @set 'status', 'ok'
  catch e
    out = e
    @set 'status', 'error'
  @set 'output', stringify out


class RCellView extends CellView

  goto-next: ->
    new Cell
      # adds to parent of current cell (TODO only if last)
      @model.collection.add ..
      ..trigger 'request-focus'

  create-editor: ->
    super ...
      ..on 'execute' @~execute
      ..on 'history-back' @~history-back

  editor-config: ->
    super! <<< do
      extraKeys:
        Enter:  !-> CodeMirror.signal it, 'execute'
        Up:     !-> CodeMirror.signal it, 'history-back'
        Esc: !-> CodeMirror.signal it, 'retract'

  # Operations

  execute: ->
    @flush-suggestions /*force=*/true
    @model.execute!
    @goto-next!

  history-back: ->
    prev = @model.collection.models.filter(~> it != @model)[*-1]
    if prev?
      @editor
        ..setValue prev.get('command')
        ..execCommand \goDocEnd
        ..markText {line:0, ch: 0}, {line: ..lastLine!, ch: ..getLine(..lastLine!).length}, {className: 'suggestion'}


class RNotebookView extends NotebookView
  item: RCellView


$ ->
  shell = new Shell

  new RNotebookView model: shell.cells
    ..$el.append-to 'body'

  new Cell command: 'ls', output: 'file.txt'
    shell.cells.add ..
  new Cell
    shell.cells.add ..
    ..trigger 'request-focus'
  
  window <<< {shell}
