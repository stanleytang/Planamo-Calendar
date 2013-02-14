/**
 * Class: StickyNotes
 * -------------------------------
 * The class for the sticky notes in the sidebar
 */

function StickyNotes() {
	var sidebar = $("#sidebar-content");
	var stickyNotes = $("<div id='sticky-notes'>");
	var noOfNotes = 0;
	
	this.resizeScrollBar = resizeScrollBar;
	
	render();
	
	/*** RENDERING ***/
	
	/**
	 * Function: render
	 * --------------------
	 * Creates the side bar with the sticky notes
	 */
	function render() {
		//TODO: color, title, delete
		
		stickyNotes.append(renderStickyNote);
		stickyNotes.append(renderStickyNote);
		sidebar.append(stickyNotes);
		sidebar.append(renderAddNoteBox);
		sidebar.append("<div class='clear' />"); 
			//Clear space at the bottom. Used to keep track of position of bottom of sidebar
			
		makeStickyNotesDraggable();
	
		//TODO: cannot select all. a small bug with expanding box (text goes up for a split second)

		resizeScrollBar();
	}
	
	/**
	 * Funciton: resizeScrollBar
	 * --------------------------
	 * If the scrollbar does not exist, it creates a scrollbar for the 
	 * slider if needed. Otherwise, it recalculates the size of the 
	 * scrollbar based on the change in height of the sidebar
	 */
	function resizeScrollBar() {
		if (sidebar.find('.lb-wrap').get(0)) {
			sidebar.ResetVBar();
		} else {
			sidebar.lionbars();
		}
	}
	
	
	/**
	 * Function: renderStickyNote
	 * --------------------------
	 * Creates one sticky note html object and returns it
	 *
	 * @return sticky note jquery/html object
	 */
	function renderStickyNote(options) {
		//TODO: eventually, options will pass in the note info from server
		
		//Create note
		noOfNotes++;
		var stickyNote = $("<div class='note' id='item" + noOfNotes + "'>");
		
		//Create title
		var noteTitle = $("<div class='sticky-note-title'>Sticky Note" + noOfNotes + "</div>");
		
		//Title editing callback
		noteTitle.dblclick(function() {
			var currentNoteTitleObject = this;
			var currentNoteTitle = $(this).html();
			$(this).html("");
			
			var textareaTitle = $("<textarea class='sticky-note-title-edit' type='text' placeholder='Note Title' />");
			textareaTitle.focus(function () {
				if (currentNoteTitle) $(this).val(currentNoteTitle);
			});
			
			textareaTitle.blur(function () {
				$(currentNoteTitleObject).html($(this).val());
				$(this).remove();
			});
			
			textareaTitle.autoResize({
				extraSpace : 0
			});
			
			textareaTitle.keydown(function (e) {
				//ESC - cancel
				if (e.keyCode == 27)  { 
					$(this).val(currentNoteTitle);
					$(this).blur();
				} 

				//Enter - change title
				if (e.keyCode == 13) { 
					$(this).blur();
				}
			});
			
			noteTitle.append(textareaTitle);
			
			textareaTitle.focus();
			textareaTitle.data('AutoResizer').check(null, true);
		});
				
		//Create note content box
		var notecontent = $("<div class='note-content' />");
		//This fixes weird bug with Firefox where can't select textarea in notes
		//This is a temp hack around it...
		notecontent.click(function() {
			$(this).find('textarea').focus();
		});
		
		//Create editable textarea
		var textarea = $("<textarea class='note-editable' type='text' placeholder='Type your notes here' />");
		textarea.autoResize({
			extraSpace : 15,
			onAfterResize: function () { 
				resizeScrollBar(); 
			}
		});
		
		//Append
		notecontent.append(textarea);
		stickyNote.append(noteTitle);
		stickyNote.append(notecontent);
		
		//Add note editing/toggle ability
		stickyNote.hover(function(){
			$(this).find('.sticky-note-title').addClass('collapse');
		}, function(){
			$(this).find('.sticky-note-title').removeClass('collapse');
		})
		/*.find('.sticky-note-title').hover()
		.click(function(){
			$(this).siblings('.note-content').toggle();
			resizeScrollBar();
		}) move this to appling for the button only*/
		
		return stickyNote;
	}
	
	/**
	 * Function: renderAddNoteBox
	 * --------------------------
	 * Creates the add sticky note html box and returns it
	 *
	 * @return add sticky note box jquery/html object
	 */
	function renderAddNoteBox() {
		var addNoteBox = $("<div id='add-new-note-box'>");
		addNoteBox.append("<center>Click here to add note</center>");
		addNoteBox.click(function() {
			stickyNotes.append(renderStickyNote());
			resizeScrollBar();
		});
		return addNoteBox;
	}
	
	/*** INTERACTIONS **/
	
	/**
	 * Function: makeStickyNotesDraggable
	 * ----------------------------------
	 * Add drag-and-drop functionality to every single sticky notes widget
	 *
	 * @return this
	 */
	function makeStickyNotesDraggable() {
		$('#sticky-notes').sortable({
			connectWith: '#sticky-notes',
			handle: '.sticky-note-title',
			cursor: 'move',
			placeholder: 'placeholder',
			forcePlaceholderSize: true,
			opacity: 0.4,
			start: function(event, ui) {
				$(".sticky-note-title-edit").blur();
			},
			stop: function(event, ui){
				$(this).siblings('.note-content').toggle();
				var sortorder='';
				$('#sticky-notes').each(function(){
					var itemorder=$(this).sortable('toArray');
					sortorder += itemorder.toString();
				});
				/*Pass sortorder variable to server using ajax to save state:
				http://webdeveloperplus.com/jquery/saving-state-for-collapsible-drag-drop-panels/ */
			}
		})
	}
	
	return this;
}