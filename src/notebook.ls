

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
      ..on 'change', (cm) ~> 
        @model.set 'command', cm.getValue!   # TODO will trigger render
      ..on 'cursorActivity' ~> @flush-suggestions!
      ..on 'retract' @~retract-suggestions
    @listenTo @model, 'change', @~render
    @listenTo @model, 'request-focus', @editor~focus

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
    @editor.getAllMarks!for-each (mark) ->
      if force || mark.find!to !== cur
        mark.clear!

  retract-suggestions: ->
    doc = @editor.getDoc!
    @editor.getAllMarks!for-each (mark) ->
      mark.find!
        doc.replaceRange '', ..from, ..to

    
class NotebookView extends Backbone.View

  tagName: 'div'
  item: CellView
  
  initialize: ->
    this.listenTo @model, 'add', @~add-one
    
  add-one: (cell) !->
    new @item model: cell
      @$el.append ..render!el
      ..editor.refresh!

  
export Cell, Notebook, NotebookView, CellView
