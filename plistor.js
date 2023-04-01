// plistor.js
// The javascript brains for the Javascript Property List Editor (PListor)

var b64 = !!(window.btoa);
var uniqueId = 0;
var currEditingInput = null;

(function () {
	//https://developer.mozilla.org/en-US/docs/Web/API/window.btoa
	window.b64encode = function (txt) {
		return window.btoa(encodeURIComponent(txt));
	};
	window.b64decore = function (txt) {
		return decodeURIComponent(window.atob(txt));
	};
})();

function makeDataRow(type, opts) {
	$(".title .long").mouseleave();
	let sub = false;
	if (!opts) opts = {};

	// For filling a data row with data already
	const prefill = opts.prefill;

	let li = $("<li>").addClass("datarow");
	let row = $("<div>").addClass("row datarow").appendTo(li);
	let key = $("<input type='text'>").addClass("key").appendTo(row);
	if (prefill) {
		key.val(prefill.key);
	}

	$("<div>").addClass("arrayIdx").on('renumber', function (e) { //custom event 'renumber'
		$(e.currentTarget).html($(li).index());
	}).appendTo(row);

	$("<div>").addClass("typename").appendTo(row);

	//$("<span>").addClass("ui-icon ui-icon-grip-solid-horizontal reorder").appendTo(row);
	$("<div>").addClass("reorder").append("<div>").appendTo(row);

	//if the prefil is for a dictionary or array, don't set it null so we can't fill things we shouldn't
	//it will be reset below when the array/dict children get filled in.
	if (prefill && $.isArray(prefill.value)) {
		prefill = null;
	}

	let content = $("<div>").addClass("content").appendTo(row);

	switch (type) {
		case "string": {
			row.addClass("data-string");
			row.find(".typename").html("String");
			const inputField = $("<input type='text'>");
			content.append(inputField).before(
				$("<button type='button'>").addClass("editbtn").button({ label: "Edit..." }).click(function (e) {
					currEditingInput = inputField;
					let str = inputField.val();
					if (inputField.prop("disabled"))
						str = inputField.data("txt");
					$("#ta-str-edit").val(str);
					$("#dlog-str-edit").dialog("open");
				})
			);
			if (prefill) {
				inputField.val(prefill.value);
				if (prefill.subtype == "multiline") {
					inputField.prop("disabled", true).data("txt", prefill.value);
				}
			}
			break;
		}
		case "number": {
			row.addClass("data-number");
			row.find(".typename").html("Number");
			content.append(
				$("<input type='text'>")
					//.spinner({numberFormat: "n"}).spinner("widget")
					.val((prefill) ? prefill.value : "")
			);
			break;
		}
		case "boolean": {
			row.addClass("data-boolean");
			row.find(".typename").html("Boolean");
			content.append(
				$("<input type='checkbox'>")
					.prop("checked", (prefill) ? (!!prefill.value) : false)
			);
			break;
		}
		case "date": {
			row.addClass("data-date");
			row.find(".typename").html("Date");
			content.append(
				$("<input type='text'>")
					.datepicker({ dateFormat: "yy-mm-dd", showAnim: "slideDown" })
					.val((prefill) ? prefill.value : "")
			);
			break;
		}
		case "data": {
			row.addClass("data-data");
			row.find(".typename").html("Data");
			const inputField = $("<div>").addClass("datafield");
			content.append(inputField).before(
				$("<button type='button'>").addClass("editbtn").button({ label: "Edit..." }).click(function (e) {
					if (!b64) {
						alert("This browser does not support native base64 encoding. Advanced editing " +
							"has been disabled to prevent data corruption.");
						b64 = -1;
					}
					currEditingInput = inputField;
					$("#ta-data-edit").val(inputField.text());
					$("#dlog-data-edit").dialog("open");
				})
			);
			if (prefill) {
				let done = false;
				if (prefill.type != "data" && b64) {
					try {
						inputField.text(btoa(prefill.value));
						done = true;
					} catch (e) {
						console.severe(e);
					}
				}
				if (!done) {
					inputField.text(prefill.value);
				}
			}
			break;
		}
		case "array": {
			row.addClass("data-array");
			row.find(".typename").html("Array");
			sub = $("<ol>").append(makeAddRow()).attr("id", "ol" + (++uniqueId));
			break;
		}
		case "dict":
		case "dictionary": {
			row.addClass("data-dict");
			row.find(".typename").html("Dictionary");
			sub = $("<ul>").append(makeAddRow()).attr("id", "ul" + (++uniqueId));
			break;
		}
	}

	if (sub) {
		sub.addClass("sub");
		const arrow = $("<span>").addClass("ui-icon ui-icon-circle-triangle-s").addClass("arrow");
		arrow.data('sub', sub);
		arrow.click(function () {
			if (sub.is(":visible")) {
				this.collapse();
			} else {
				this.expand();
			}
		});
		const arrowElement = arrow.get(0);
		arrowElement.collapse = function (immediate, callback) {
			arrow.removeClass("ui-icon-circle-triangle-s").addClass("ui-icon-circle-triangle-e");
			sub.slideUp(immediate ? 0 : 400, callback);
		};
		arrowElement.expand = function (immediate, callback) {
			arrow.removeClass("ui-icon-circle-triangle-e").addClass("ui-icon-circle-triangle-s");
			sub.slideDown(immediate ? 0 : 400, callback);
		};
		arrow.appendTo(content);

		if (opts.prefill && $.isArray(opts.prefill.value)) {
			// If we have a prefill for an array or dictionary
			prefill = opts.prefill;
			// For each item in the prefill, make a subrow for it via recursion
			$.each(prefill.value, function (i, e) {
				var item = makeDataRow(e.type, { prefill: e });
				sub.append(item);
			});
		}

		sub.appendTo(li);
	}
	row.append("<div style='clear: both;'>");

	if (opts.before) {
		li.insertBefore(opts.before);
		row.find("input:visible").first().focus();

		row.find(".arrayIdx").trigger('renumber');
	}
	return li;
}

function makeDeleteRow() {
	const li = $("<li>").addClass("delrow").hide();
	const row = $("<div>").addClass("row delrow").append(
		$("<div>").css({ float: "left", margin: "5px" }).html("Row Deleted.")
	).appendTo(li);
	const bs = $("<div>").addClass("content").css({ "text-align": "center" });

	$("<button type='button'>").button({ label: "Undo" }).click(function (e) {
		e.preventDefault();
		const prev = li.data("deleted");
		prev.hide().insertAfter(li);
		prev.show({ effect: "blind", duration: 400, queue: false });
		li.hide({
			effect: "blind", duration: 400, queue: false, complete: function () {
				li.detach();
			}
		});
	}).appendTo(bs);
	$("<span>").addClass("ui-icon ui-icon-closethick").click(function (e) {
		e.preventDefault();
		li.hide({
			effect: "blind", duration: 200, queue: false, complete: function () {
				li.detach();
				$(".arrayIdx").trigger('renumber');
			}
		});
	}).addClass("editbtn").css({}).appendTo(bs);
	bs.appendTo(row);
	return li;
}

function makeAddRow() {
	let li = $("<li>").addClass("addrow");
	let row = $("<div>").addClass("row addrow").append(
		$("<div>").css({ float: "left", margin: "5px" }).html("Add Row of Type: ")
	).appendTo(li);
	let bs = $("<div>").addClass("content");

	$("<button type='button'>").button({ label: "String" }).click(function (e) {
		e.preventDefault();
		makeDataRow("string", { before: li });
	}).appendTo(bs);
	$("<button type='button'>").button({ label: "Number" }).click(function (e) {
		e.preventDefault();
		makeDataRow("number", { before: li });
	}).appendTo(bs);
	$("<button type='button'>").button({ label: "Boolean" }).click(function (e) {
		e.preventDefault();
		makeDataRow("boolean", { before: li });
	}).appendTo(bs);
	$("<button type='button'>").button({ label: "Date" }).click(function (e) {
		e.preventDefault();
		makeDataRow("date", { before: li });
	}).appendTo(bs);
	$("<button type='button'>").button({ label: "Data" }).click(function (e) {
		e.preventDefault();
		makeDataRow("data", { before: li });
	}).appendTo(bs);
	$("<button type='button'>").button({ label: "Array" }).click(function (e) {
		e.preventDefault();
		makeDataRow("array", { before: li });
	}).appendTo(bs);
	$("<button type='button'>").button({ label: "Dictionary" }).click(function (e) {
		e.preventDefault();
		makeDataRow("dict", { before: li });
	}).appendTo(bs);

	bs.buttonset().appendTo(row);
	return li;
}

//returns a row in a regular format: {key, value, type, and (optional) subtype}
function getRowData(row) {
	if (!$(row).is("div.datarow")) return null;
	const key = row.children(".key").val();
	let children;
	switch (true) {
		case row.is(".data-string"): {
			const input = row.find(".content input");
			const value = input.val();
			if (input.prop("disabled"))
				value = input.data("txt");

			return {
				key: key,
				value: value,
				type: "string",
				subtype: (input.prop("disabled")) ? "multiline" : "singleline"
			};
		}
		case row.is(".data-number"): {
			const val = row.find(".content input").val();
			if (val.indexOf('.') > -1) {
				return { key: key, value: val, type: "number", subtype: "real" };
			} else {
				return { key: key, value: val, type: "number", subtype: "int" };
			}
		}
		case row.is(".data-boolean"): {
			return {
				key: key,
				value: (row.find(".content input").is(":checked")),
				type: "boolean"
			};
		}
		case row.is(".data-date"): {
			return {
				key: key,
				value: row.find(".content input").val(),
				type: "date"
			};
		}
		case row.is(".data-data"): {
			return {
				key: key,
				value: row.find(".content .datafield").text(),
				type: "data"
			};
		}
		case row.is(".data-array"): {
			children = [];
			row.closest("li").children("ol").children("li").each(_getSub);
			return {
				key: key,
				value: children,
				type: "array",
			}
		}
		case row.is(".data-dict"): {
			children = [];
			row.closest("li").children("ul").children("li").each(_getSub);
			return {
				key: key,
				value: children,
				type: "dict",
			}
		}
	}

	function _getSub(i, e) {
		const row = $(e).find("> .row");
		if (!row.is("div.datarow")) return;
		children.push(getRowData(row));
	}
}

// XML functions
function toXML() {
	// Converts all the data here into saveable XML
	let str = '<?xml version="1.0" encoding="UTF-8"?>\n';
	str += '<\!DOCTYPE plist SYSTEM "file://localhost/System/Library/DTDs/PropertyList.dtd">\n';
	str += '<plist version="1.0">\n';
	str += '<dict>\n';

	let ident = 1;

	$("#toplist > li").each(_getDict);
	function _getDict(i, e) {
		const row = $(e).find("> .row");
		if (!row.is("div.datarow")) return;
		var key = row.find(".key").val();

		for (let i = 0; i < ident; i++) str += "\t";
		str += "<key>" + key + "</key>\n";

		for (let i = 0; i < ident; i++) str += "\t";
		_get(i, $(e), row);
	}
	function _getArray(i, e) {
		const row = $(e).find("> .row");
		if (!row.is("div.datarow")) return;

		for (let i = 0; i < ident; i++) str += "\t";
		_get(i, $(e), row);
	}
	function _get(i, e, row) {
		switch (true) {
			case row.is(".data-string"): {
				str += "<string>";
				let input = row.find(".content input");
				let value = input.val();
				if (input.prop("disabled"))
					value = input.data("txt");

				if (input.prop("disabled") || value.search(/[\<\>]/) > -1) {
					value = "<![CDATA[" + value + "]]>";
				}
				str += value;
				str += "</string>\n";
			} break;
			case row.is(".data-number"): {
				var val = row.find(".content input").val();
				if (val.indexOf('.') > -1) {
					str += "<real>";
					str += val
					str += "</real>\n";
				} else {
					str += "<integer>";
					str += val
					str += "</integer>\n";
				}
			} break;
			case row.is(".data-boolean"): {
				if (row.find(".content input").is(":checked")) {
					str += "<true/>\n";
				} else {
					str += "<false/>\n";
				}
			} break;
			case row.is(".data-date"): {
				str += "<date>";
				str += row.find(".content input").val();
				str += "</date>\n";
			} break;
			case row.is(".data-data"): {
				str += "<data>";
				str += row.find(".content .datafield").text();
				str += "</data>\n";
			} break;
			case row.is(".data-array"): {
				str += "<array>\n";
				ident++;
				e.children("ol").children("li").each(_getArray);
				ident--;
				for (let i = 0; i < ident; i++) str += "\t";
				str += "</array>\n";
			} break;
			case row.is(".data-dict"): {
				str += "<dict>\n";
				ident++;
				e.children("ul").children("li").each(_getDict);
				ident--;
				for (let i = 0; i < ident; i++) str += "\t";
				str += "</dict>\n";
			} break;
		}
	}

	str += '</dict>\n';
	str += '</plist>\n';
	return str;
}

function fromXML(xml) {
	let $doc = $($.parseXML(xml));
	let top = $doc.find("plist > dict");
	let listStack = [$("<ul>")];

	top.find("> key").each(_forDict);

	function _forDict(i, e) {
		// Get last element, top of stack
		const list = listStack[listStack.length - 1];
		const key = $(e).text();
		const valnode = $(e).next();
		_put(key, valnode, list);
	}
	function _forArray(i, e) {
		// Get last element, top of stack
		const list = listStack[listStack.length - 1];
		const valnode = $(e);
		_put("", valnode, list);
	}
	function _put(key, n, list) {
		switch (true) {
			case n.is("string"): {
				const row = makeDataRow("string");
				row.find(".key").val(key);

				const input = row.find(".content input");
				const value = n.text();
				input.val(value);

				// Preserve new lines
				if (value.indexOf('\n') > -1) {
					input.data("txt", value);
					input.prop("disabled", true);
				}

				list.append(row);
			} break;
			case n.is("real"):
			case n.is("integer"): {
				const row = makeDataRow("number");
				row.find(".key").val(key);
				row.find(".content input").val(n.text());
				list.append(row);
			} break;
			case n.is("true"):
			case n.is("false"): {
				const row = makeDataRow("boolean");
				row.find(".key").val(key);
				row.find(".content input").prop('checked', n.is("true"));
				list.append(row);
			} break;
			case n.is("date"): {
				const row = makeDataRow("date");
				row.find(".key").val(key);
				row.find(".content input").val(n.text());
				list.append(row);
			} break;
			case n.is("data"): {
				const row = makeDataRow("data");
				row.find(".key").val(key);
				row.find(".content .datafield").text(n.text());
				list.append(row);
			} break;
			case n.is("array"): {
				const row = makeDataRow("array");
				row.find(".key").val(key);

				listStack.push($("<ol>"));
				n.children().each(_forArray);
				row.children("ol").prepend(
					listStack.pop().children()
				);
				list.append(row);
			} break;
			case n.is("dict"): {
				const row = makeDataRow("dict");
				row.find(".key").val(key);

				listStack.push($("<ul>"));
				n.children("key").each(_forDict);
				row.children("ul").prepend(
					listStack.pop().children()
				);
				list.append(row);
			} break;
		}
	}
	return listStack[0].attr("id", "toplist").append(makeAddRow());
}


$(function () {
	// Javascript Property List Editor by Tustin2121
	$(".title .short").mouseenter(function () {
		$(".title .short").hide();
		$(".title .long").show();
	});
	$(".title .long").mouseleave(function () {
		$(".title .short").show();
		$(".title .long").hide();
	});

	function initToplist() {
		$("#toplist").nestedSortable({
			axis: "y",
			cancel: ".addrow",
			delay: 100,
			handle: ".reorder",
			toleranceElement: "> .row",
			opacity: 0.5,
			items: 'li',
			placeholder: 'sort-placeholder',
			forcePlaceholderSize: true,
			revert: true,
			listType: "ul",
			isAllowed: function (item, parent) {
				if ($(parent).children(".row").hasClass("data-array") ||
					$(parent).children(".row").hasClass("data-dict"))
					return true;
				return false;
			},
		}).on("sortupdate", function (e, ui) {
			// After resorted, fix things which are now out of order
			$(".arrayIdx").trigger('renumber');
			if ($("li.addrow").length != ("li.addrow:last-child").length) {
				// If the user moved something under the add row, fix it
				$("li.addrow").each(function (i, e) {
					var parent = $(e).parent();
					$(e).detach().appendTo(parent);
				});
			}
		}).contextmenu({
			// Context Menu: Rows
			delegate: "div.datarow div:not(.content),.data-array div,.data-dict div",
			// To prevent hash tags getting put into the location
			ignoreParentSelect: false,
			menu: [
				{ title: "Delete Row", cmd: "rm", uiIcon: "ui-icon-trash" },
				{ title: "Duplicate", cmd: "cp", uiIcon: "ui-icon-copy" },
				{ title: "----" },
				{ title: "Expand All", cmd: "fold-expand", uiIcon: "ui-icon-plus" },
				{ title: "Collapse All", cmd: "fold-collapse", uiIcon: "ui-icon-minus" },
				{ title: "----" },
				{
					title: "Convert To", cmd: "conv-menu-drow", uiIcon: "ui-icon-refresh", children: [
						{ title: "String", cmd: "conv-string" },
						{ title: "Number", cmd: "conv-number" },
						{ title: "Boolean", cmd: "conv-boolean" },
						{ title: "Date", cmd: "conv-date" },
						{ title: "Data", cmd: "conv-data" },
					]
				},
				{
					title: "Convert To", cmd: "conv-menu-coll", uiIcon: "ui-icon-refresh", children: [
						{ title: "Array", cmd: "conv-array" },
						{ title: "Dictionary", cmd: "conv-dict" },
					]
				},
			],
			show: false,
			hide: false,
			select: function (e, ui) {
				switch (ui.cmd) {
					case "conv-menu-drow":
					case "conv-menu-coll": return false;
					// Delete
					case "rm": {
						var li = ui.target.closest("li.datarow");
						var delrow = makeDeleteRow();
						delrow.data("deleted", li);
						delrow.insertBefore(li);
						delrow.show({ effect: "blind", duration: 400, queue: false });
						li.hide({
							effect: "blind", duration: 400, queue: false, complete: function () {
								li.detach();
							}
						});
					} return true;
					// Duplicate
					case "cp": {
						const oldrow = ui.target.closest("div.datarow");
						const data = getRowData(oldrow);
						const newrow = makeDataRow(data.type, { prefill: data });
						oldrow = oldrow.closest("li.datarow");
						newrow.hide().insertAfter(oldrow);
						newrow.show({
							effect: "blind", duration: 400, queue: false, complete: function () {
								$(".arrayIdx").trigger('renumber');
							}
						});
					} return true;
					case "fold-expand": {
						const row = ui.target.closest("div.datarow");
						const arrow = row.find('.arrow');
						let arrows = arrow.data('sub').find(".arrow");
						// Immediately expand all non-visible items, and then animate the visible ones
						arrows.not(":visible").each(function () { this.expand(true); });
						arrows.filter(":visible").each(function () { this.expand(); });
						arrow.get(0).expand();
					} return true;
					case "fold-collapse": {
						const row = ui.target.closest("div.datarow");
						const arrow = row.find('.arrow');
						let arrows = arrow.data('sub').find(".arrow");
						// Collapse current content
						arrow.get(0).collapse(false, function () {
							// Then when animation is complete, immediately collapse everything inside
							arrows.each(function () { this.collapse(true); });
						});
					} return true;
				}
				const mode = /^conv\-(.*)/.exec(ui.cmd);
				if (mode && mode[1]) { //conversion!
					let oldrow = ui.target.closest("div.datarow");
					let data = getRowData(oldrow);

					// If they are the same data type, do nothing
					if (mode[1] == data.type) return true;

					oldrow = oldrow.closest("li.datarow");
					let newrow = makeDataRow(mode[1], { prefill: data });
					newrow.hide().insertBefore(oldrow);
					newrow.show({ effect: "blind", duration: 400, queue: false });
					oldrow.hide({
						effect: "blind", duration: 400, queue: false, complete: function () {
							oldrow.detach();
							$(".arrayIdx").trigger('renumber');
						}
					});
					return true;
				}
			},
			beforeOpen: function (e, ui) {
				var row = ui.target.closest("div.datarow");
				if (row.is(".data-array,.data-dict")) {
					$("#toplist").contextmenu("showEntry", "conv-menu-coll", true);
					$("#toplist").contextmenu("showEntry", "conv-menu-drow", false);
				} else {
					$("#toplist").contextmenu("showEntry", "conv-menu-coll", false);
					$("#toplist").contextmenu("showEntry", "conv-menu-drow", true);
				}
			}
		});
	}
	initToplist();

	// Make all the buttons... buttons
	$("#topmenu button").button();
	$("#import").click(function () {
		$("#ta-imexport").val("");
		$("#dlog-import-button").show();
		$("#dlog-imexport")
			.dialog("option", "title", "Import Plist")
			.dialog("open");
	});
	$("#export").click(function () {
		$("#ta-imexport").val(toXML());
		$("#dlog-import-button").hide();
		$("#dlog-imexport")
			.dialog("option", "title", "Export Plist")
			.dialog("open");
		$("#ta-imexport").focus().select();
	});

	 // TODO: open from file
	$("#open").hide();
	// TODO: save to file, if supported
	$("#save").hide();

	$("#validate").hide();
	//TODO validate items:
	//- ensure all dictionary entries have unique keys
	//- make sure number entries are parsible to numbers
	//- make sure dates are parsible to dates (TODO add time as well)

	// Dialogs
	$("#dlog-imexport").dialog({
		dialogClass: "dlog",
		resizable: false,
		position: { my: "top left", at: "bottom left", of: "#topmenu", collision: "none" },
		autoOpen: false,
		height: 500, width: "80%",
		modal: true,
		buttons: {
			"Import": function () {
				try {
					const topnode = fromXML($("#ta-imexport").val());
					if (topnode) {
						$("#toplist").replaceWith(topnode);
						initToplist();
						$(".arrayIdx").trigger('renumber');
						$(this).dialog("close");
					}
				} catch (e) {
					if (e.message.match(/^Invalid XML/)) {
						alert("The XML you provided is invalid XML. Ensure you pasted the whole thing.");
					} else throw e;
				}
			},
			"Close": function () {
				$(this).dialog("close");
			},
		},
	})
		.dialog("widget").find(".ui-dialog-buttonset button").first().attr("id", "dlog-import-button");

	$("#dlog-str-edit").dialog({
		dialogClass: "dlog",
		resizable: false,
		position: { my: "top left", at: "top+10 left+10%", of: "#topmenu" },
		autoOpen: false,
		height: 500, width: "80%",
		modal: true,
		buttons: {
			"Save": function () {
				var str = $("#ta-str-edit").val();
				if (str.indexOf('\n') > -1) {
					// Must preserve new lines
					$(currEditingInput).prop("disabled", true).val(str);
					$(currEditingInput).data("txt", str);
				} else {
					$(currEditingInput).prop("disabled", false).val(str);
				}

				$(this).dialog("close");
			},
			"Cancel": function () {
				$(this).dialog("close");
			},
		},
		close: function () {
			currEditingInput = null;
		},
	});

	// Data Dialog
	(function () {
		$("#dlog-data-edit").dialog({
			dialogClass: "dlog",
			resizable: false,
			position: { my: "top left", at: "top+10 left+10%", of: "#topmenu" },
			autoOpen: false,
			height: 500, width: "80%",
			modal: true,
			buttons: {
				"Save": function () {
					$(currEditingInput).text($("#ta-data-edit").val());
					$(this).dialog("close");
				},
				"Cancel": function () {
					$(this).dialog("close");
				},
			},
			open: function (e, ui) {
				$("#ta-data-str").val("").data("dirty", false);
			},
			close: function (e, ui) {
				currEditingInput = null;
			},
		});

		$("#ta-data-str").on("change", function (e) {
			$("#ta-data-str").data("dirty", true);
		}).on("blur", function (e) {
			if ($("#ta-data-str").data("dirty")) {
				$("#ta-data-str").data("dirty", false);
				var str = $("#ta-data-str").val();
				try {
					str = btoa(str);
					// Note, we don't use the unescape, etc. stuff to keep the data as pure as possible
				} catch (e) {
					alert("The string you entered is cannot be converted properly in " +
						"this browser. Consider removing unicode characters or using " +
						"another utility to convert to base64.");
				}
				$("#ta-data-edit").val(str);
			}
		});

		$("#tabs-data").tabs({
			// Disable panels if no base64
			disabled: (function () { return (b64) ? false : [0, 1]; })(),
			// Set to raw only editing if no base64
			active: (function () { return (b64) ? 0 : 2; })(),
			beforeActivate: function (e, ui) {
				if ($(ui.newPanel).is("#dt-raw")) {
					// TODO: blur panels
				}
			},
		});

		// Due to how I hate the nested tab control in the dialog box, Frankenstein the two!
		var tab_header = $("#tabs-data").tabs("widget").find(".ui-tabs-nav");
		var dlog_header = $("#dlog-data-edit").dialog("widget").find(".ui-dialog-titlebar");

		tab_header.detach().removeClass("ui-widget-header");
		dlog_header.css({ "padding-bottom": "0" }).addClass("ui-tabs");
		dlog_header.children(".ui-dialog-title").after(tab_header).css({ "float": "none" });
		$("#tabs-data").removeClass("ui-tabs ui-widget ui-widget-content ui-corner-all");
		$("#tabs-data .ui-tabs-panel").removeClass("ui-widget-content ui-corner-bottom");
	})();

	// Fix for dialog positioning off screen
	$.ui.dialog.prototype._position = function () { };
	//Fix for dialog resizing reverting to absolute
	//	$(".ui-resizable").on("resizestop", function(){
	//		$(".dlog").css({position:"fixed"});
	//	});

	$("#toplist").empty().append(makeAddRow());
});
