

class Cell extends Backbone.Model

Notebook = Backbone.Collection.extend do
  model: Cell



class CellView extends Backbone.View

  tagName: 'div'

  initialize: ->
    cmd = $ '<div>' .addClass 'command'
    output = $ '<div>' .addClass 'output'
    @editor = @create-editor cmd.0
    @$el
      ..addClass 'cell'
      ..append cmd
      ..append output

    @event-hooks!

  event-hooks: ->
    @editor
      ..on 'change', (cm, changeobj) ~>
        @model.set 'command', cm.getValue!   # TODO will trigger render
        @completion-react changeobj
      ..on 'cursorActivity' ~> @flush-suggestions!
      ..on 'retract' @~retract-suggestions
      ..on 'complete' @~completion-invoke
    @listenTo @model, 'change', @~render
    @listenTo @model, 'request-focus', ~>
      @editor.focus!
      requestAnimationFrame ~>  # editor height is not set at this point yet...
        @$el.0.scrollIntoView!

  render: ->
    @$('.output')
      ..text @model.get('output')
      ..addClass @model.get('status')
    @

  create-editor: (el) ->
    new CodeMirror el, @editor-config!
      ..setValue @model.get('command') ? ''

  editor-config: ->
    lineNumbers: true
    viewportMargin: Infinity

  #-----------------
  # Completion Part
  #-----------------

  flush-suggestions: (force) ->
    cur = @editor.getCursor!
    console.log 'flush', cur, @editor.getAllMarks!map (-> "[#{it.find!from.ch}..#{it.find!to.ch}]")
    @editor.getAllMarks!for-each (mark) ~>
      mark.find!
        if force || !(..to === cur || ..from === cur)
          mark.clear!
          if mark.transient then @editor.replaceRange '', ..from, ..to

  retract-suggestions: ->
    doc = @editor.getDoc!
    @editor.getAllMarks!for-each (mark) ->
      mark.find!
        doc.replaceRange '', ..from, ..to

  completion-react: (changeobj) ->
    #console.log changeobj
    if changeobj.origin == '+input' && changeobj.text.length == 1 /* single-line input */
      ins = changeobj.text .0
      active-mark = @editor.findMarksAt @editor.getCursor! .filter (.className == 'suggestion') .0
      if active-mark?
        active-mark.find!
          [from_, to_] = [..from, {line: ..from.line, ch: ..from.ch + ins.length}]
          if ins == @editor.getRange from_, to_
            @editor.replaceRange '', from_, to_
          else
            anchor-mark = @editor.getAllMarks!filter (.className == 'suggestion-anchor') .0
            if anchor-mark? && (prefix = @editor.getRange(anchor-mark.find!from, from_))? &&
               (item = @find-by-prefix(@suggestion-list, prefix))?
              # put new suggestion inside active-mark and do not move the insertion point
              @editor.replaceRange item.substr(prefix.length), ..to, ..to, '+suggest'
              @editor.replaceRange '', ..from, ..to, '+suggest'
            else
              @flush-suggestions /*force:*/ true
      else if ins[*-1] == '/'
        @completion-suggest!
    else if changeobj.origin == '+delete'
      @flush-suggestions /*force:*/ true

  completion-suggest: ->
    @editor.getCursor!
      left-of-cursor = @editor.getRange {..line, ch: 0}, ..
      if (mo = /(\S+)$/.exec left-of-cursor)?
        prefix = mo.1

    @suggestion-list =
      if prefix?
        try
          fs.readdirSync prefix
        catch
          []
      else
        ['file1.txt', 'file2.txt', 'README']

    @suggestion-list[0]
      if ..? then @completion-suggest-term ..

  completion-suggest-term: (text) ->
    options = {className: 'suggestion', clearWhenEmpty: false, \
               inclusiveRight: true, transient: true}
    @insert-marked-text text, options, /*origin:*/ '+suggest'
    options = {className: 'suggestion-anchor', clearWhenEmpty: false, \
               inclusiveLeft: true, inclusiveRight: true}
    @insert-marked-text '', options, /*origin:*/ '+suggest'

  /**
   * Accept current suggestion or request suggestions to be shown.
   */
  completion-invoke: ->
    active-mark = @editor.findMarksAt @editor.getCursor! .filter (.className == 'suggestion') .0
    console.log 'invoke', active-mark
    if active-mark?
      active-mark.transient = false
      active-mark.find!
        @flush-suggestions /*force:*/ true
        @editor.setCursor ..to

  /**  (auxiliary function)
   * Insert a text string marked with options at the current insertion point. 
   */
  insert-marked-text: (text, options, origin) ->
    @editor
      anchor = ..getCursor!
      ..replaceRange text, anchor, anchor, origin
      ..markText anchor, ..getCursor!, options
      ..setSelection anchor, anchor, origin

  find-by-prefix: (list, prefix) ->
    console.log list, prefix
    list.find (.startsWith prefix)


class NotebookView extends Backbone.View

  tagName: 'div'
  item: CellView

  initialize: ->
    @items = []
    @listenTo @model, 'add', @~add-one

  add-one: (cell) !->
    new @item model: cell
      @items.push ..
      @$el.append ..render!el
      ..editor.refresh!


export Cell, Notebook, NotebookView, CellView
